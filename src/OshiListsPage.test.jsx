import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import OshiListsPage from './OshiListsPage.jsx'
import { OSHI_LIST_UPDATED_EVENT } from './oshiListEvents.js'

const renderOshiListsPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <OshiListsPage dataProvider={dataProvider} authGate={authGate} />
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

describe('OshiListsPage', () => {
  it('見出しと読み込み状態が表示される', () => {
    const deferred = createDeferred()
    renderOshiListsPage(
      { fetchCatalog: vi.fn().mockReturnValue(deferred.promise) },
      { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) }
    )
    expect(screen.getByRole('heading', { name: 'みんなの推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('読み込み中です。')).toBeInTheDocument()
  })

  it('認証済みなら推し一覧の取得を開始する', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(dataProvider.fetchCatalog).toHaveBeenCalledWith({ sortOrder: 'favorite_desc' })
    })
    expect(authGate.redirectToLogin).not.toHaveBeenCalled()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.fetchCatalog).not.toHaveBeenCalled()
  })

  it('取得成功で一覧を表示する', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            listId: '1',
            name: '推しリスト',
            favoriteCount: 5,
            isFavorited: true,
            visibility: 'public',
          },
          {
            listId: '2',
            name: '推しリスト2',
            favoriteCount: 2,
            isFavorited: false,
            visibility: 'public',
          },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリスト')).toBeInTheDocument()
    })
    expect(screen.getByText('推しリスト2')).toBeInTheDocument()
    expect(screen.getByText('お気に入り数: 5')).toBeInTheDocument()
    expect(screen.getByText('済')).toBeInTheDocument()
    expect(screen.getByText('推')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument()
  })

  it('並び替え条件を切り替える', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(dataProvider.fetchCatalog).toHaveBeenCalledTimes(1)
    })
    fireEvent.click(screen.getByRole('button', { name: '少ない順' }))

    await waitFor(() => {
      expect(dataProvider.fetchCatalog).toHaveBeenCalledWith({
        sortOrder: 'favorite_asc',
      })
    })
  })

  it('お気に入りトグルで状態と登録数を更新する', async () => {
    const dataProvider = {
      fetchCatalog: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 5,
              isFavorited: true,
              visibility: 'public',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 4,
              isFavorited: false,
              visibility: 'public',
            },
          ],
        }),
      toggleFavorite: vi.fn().mockResolvedValue({
        ok: true,
        data: { isFavorited: false },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '解除' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '登録' })).toBeInTheDocument()
      expect(screen.getByText('お気に入り数: 4')).toBeInTheDocument()
    })
    expect(dataProvider.toggleFavorite).toHaveBeenCalledWith('1')
  })

  it('推し更新イベントで一覧を再取得する', async () => {
    const dataProvider = {
      fetchCatalog: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 5,
              isFavorited: true,
              visibility: 'public',
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 5,
              isFavorited: true,
              visibility: 'public',
            },
            {
              listId: '2',
              name: '推しリスト2',
              favoriteCount: 2,
              isFavorited: true,
              visibility: 'public',
            },
          ],
        }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリスト')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new Event(OSHI_LIST_UPDATED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByText('推しリスト2')).toBeInTheDocument()
    })
    expect(dataProvider.fetchCatalog).toHaveBeenCalledTimes(2)
  })

  it('取得結果が空なら空状態を表示する', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('公開されている推しリストがありません。')).toBeInTheDocument()
    })
  })

  it('取得失敗時はエラー表示を出し一覧は表示しない', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({ ok: false, error: 'network' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリストの取得に失敗しました。')).toBeInTheDocument()
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
