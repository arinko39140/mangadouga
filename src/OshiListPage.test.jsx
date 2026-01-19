import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import OshiListPage from './OshiListPage.jsx'
import { OSHI_LIST_UPDATED_EVENT } from './oshiListEvents.js'

const renderOshiListPage = (dataProvider, authGate, listId = '1') =>
  render(
    <MemoryRouter initialEntries={[`/oshi-lists/${listId}/`]}>
      <Routes>
        <Route
          path="/oshi-lists/:listId/"
          element={<OshiListPage dataProvider={dataProvider} authGate={authGate} />}
        />
      </Routes>
    </MemoryRouter>
  )

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('OshiListPage', () => {
  it('見出しと読み込み状態が表示される', () => {
    const summaryDeferred = createDeferred()
    const itemsDeferred = createDeferred()
    renderOshiListPage(
      {
        fetchListSummary: vi.fn().mockReturnValue(summaryDeferred.promise),
        fetchListItems: vi.fn().mockReturnValue(itemsDeferred.promise),
        fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'forbidden' }),
      },
      { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) }
    )
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('読み込み中です。')).toBeInTheDocument()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const dataProvider = {
      fetchListSummary: vi.fn(),
      fetchListItems: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.fetchListSummary).not.toHaveBeenCalled()
    expect(dataProvider.fetchListItems).not.toHaveBeenCalled()
  })

  it('取得成功で詳細を表示する', async () => {
    const dataProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          name: '推しリストA',
          favoriteCount: 4,
          isFavorited: true,
          visibility: 'public',
        },
      }),
      fetchListItems: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '推し作品',
          },
        ],
      }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'forbidden' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリストA')).toBeInTheDocument()
    })
    expect(screen.getByText('お気に入り数: 4')).toBeInTheDocument()
    expect(screen.getByText('推')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    expect(screen.getByText('推し作品')).toBeInTheDocument()
  })

  it('お気に入りトグルで状態と登録数を更新する', async () => {
    const dataProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          name: '推しリストA',
          favoriteCount: 2,
          isFavorited: true,
          visibility: 'public',
        },
      }),
      fetchListItems: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      toggleFavorite: vi.fn().mockResolvedValue({ ok: true, data: { isFavorited: false } }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'forbidden' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '解除' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument()
      expect(screen.getByText('お気に入り数: 1')).toBeInTheDocument()
    })
    expect(dataProvider.toggleFavorite).toHaveBeenCalledWith('1')
  })

  it('推し更新イベントで詳細を再取得する', async () => {
    const dataProvider = {
      fetchListSummary: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: {
            name: '推しリストA',
            favoriteCount: 1,
            isFavorited: true,
            visibility: 'public',
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          data: {
            name: '推しリストA',
            favoriteCount: 2,
            isFavorited: true,
            visibility: 'public',
          },
        }),
      fetchListItems: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [{ id: 'movie-1', title: '推し作品' }],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            { id: 'movie-1', title: '推し作品' },
            { id: 'movie-2', title: '推し作品2' },
          ],
        }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'forbidden' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し作品')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new Event(OSHI_LIST_UPDATED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByText('推し作品2')).toBeInTheDocument()
    })
    expect(dataProvider.fetchListSummary).toHaveBeenCalledTimes(2)
    expect(dataProvider.fetchListItems).toHaveBeenCalledTimes(2)
  })

  it('公開/非公開UIは所有者のみ表示する', async () => {
    const ownerProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          name: '推しリストA',
          favoriteCount: 0,
          isFavorited: false,
          visibility: 'public',
        },
      }),
      fetchListItems: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: true, data: { visibility: 'public' } }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    const { unmount } = renderOshiListPage(ownerProvider, authGate)

    await waitFor(() => {
      expect(screen.getByRole('group', { name: '公開設定' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '公開' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '非公開' })).toBeInTheDocument()

    const nonOwnerProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          name: '推しリストA',
          favoriteCount: 0,
          isFavorited: false,
          visibility: 'public',
        },
      }),
      fetchListItems: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'forbidden' }),
    }

    unmount()
    renderOshiListPage(nonOwnerProvider, authGate, '2')

    await waitFor(() => {
      expect(
        screen.queryByRole('group', { name: '公開設定' })
      ).not.toBeInTheDocument()
    })
  })

  it('取得失敗時は非公開メッセージを表示する', async () => {
    const dataProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({ ok: false, error: 'not_found' }),
      fetchListItems: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'forbidden' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリストを表示できません。')).toBeInTheDocument()
    })
  })
})
