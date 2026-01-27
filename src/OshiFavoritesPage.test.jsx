import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import OshiFavoritesPage from './OshiFavoritesPage.jsx'
import { OSHI_LIST_UPDATED_EVENT } from './oshiListEvents.js'

const renderOshiFavoritesPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <OshiFavoritesPage dataProvider={dataProvider} authGate={authGate} />
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

describe('OshiFavoritesPage', () => {
  it('見出しと読み込み状態が表示される', () => {
    const deferred = createDeferred()
    renderOshiFavoritesPage(
      { fetchFavorites: vi.fn().mockReturnValue(deferred.promise) },
      { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) }
    )
    expect(screen.getByRole('heading', { name: 'お気に入り推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('読み込み中です。')).toBeInTheDocument()
  })

  it('認証済みならお気に入り一覧の取得を開始する', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(dataProvider.fetchFavorites).toHaveBeenCalled()
    })
    expect(authGate.redirectToLogin).not.toHaveBeenCalled()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.fetchFavorites).not.toHaveBeenCalled()
  })

  it('取得成功で一覧を表示する', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            listId: '1',
            name: '推しリスト',
            favoriteCount: 3,
            isFavorited: true,
          },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリスト')).toBeInTheDocument()
    })
    expect(screen.getByText('お気に入り数: 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
  })

  it('一覧はグリッド形式で表示される', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            listId: '1',
            name: '推しリスト',
            favoriteCount: 3,
            isFavorited: true,
          },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    const list = await screen.findByRole('list', { name: 'お気に入り推しリスト' })
    expect(list.className).toContain('oshi-lists__items--grid')
  })

  it('お気に入り解除で一覧から削除する', async () => {
    const dataProvider = {
      fetchFavorites: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 3,
              isFavorited: true,
            },
          ],
        })
        .mockResolvedValueOnce({ ok: true, data: [] }),
      toggleFavorite: vi.fn().mockResolvedValue({
        ok: true,
        data: { isFavorited: false },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '解除' }))

    await waitFor(() => {
      expect(
        screen.getByText('お気に入り登録済みの推しリストがありません。')
      ).toBeInTheDocument()
    })
    expect(dataProvider.toggleFavorite).toHaveBeenCalledWith('1')
  })

  it('未認証ならお気に入り操作を中断してログインへ誘導する', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            listId: '1',
            name: '推しリスト',
            favoriteCount: 3,
            isFavorited: true,
          },
        ],
      }),
      toggleFavorite: vi.fn(),
    }
    const authGate = {
      getStatus: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, status: { isAuthenticated: true } })
        .mockResolvedValueOnce({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '解除' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '解除' }))

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.toggleFavorite).not.toHaveBeenCalled()
  })

  it('推し更新イベントで一覧を再取得する', async () => {
    const dataProvider = {
      fetchFavorites: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 3,
              isFavorited: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              listId: '1',
              name: '推しリスト',
              favoriteCount: 3,
              isFavorited: true,
            },
            {
              listId: '2',
              name: '推しリスト2',
              favoriteCount: 1,
              isFavorited: true,
            },
          ],
        }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリスト')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new Event(OSHI_LIST_UPDATED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByText('推しリスト2')).toBeInTheDocument()
    })
    expect(dataProvider.fetchFavorites).toHaveBeenCalledTimes(2)
  })

  it('取得結果が空なら空状態を表示する', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(
        screen.getByText('お気に入り登録済みの推しリストがありません。')
      ).toBeInTheDocument()
    })
  })

  it('取得失敗時はエラー表示を出し一覧は表示しない', async () => {
    const dataProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({ ok: false, error: 'network' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiFavoritesPage(dataProvider, authGate)

    await waitFor(() => {
      expect(
        screen.getByText('お気に入り推しリストの取得に失敗しました。')
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
