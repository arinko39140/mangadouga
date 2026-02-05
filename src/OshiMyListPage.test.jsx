import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import OshiMyListPage from './OshiMyListPage.jsx'
import { OSHI_LIST_UPDATED_EVENT } from './oshiListEvents.js'

const renderOshiMyListPage = (dataProvider, authGate, navigateToMovie) =>
  render(
    <MemoryRouter>
      <OshiMyListPage
        dataProvider={dataProvider}
        authGate={authGate}
        navigateToMovie={navigateToMovie}
      />
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

describe('OshiMyListPage', () => {
  it('見出しと読み込み状態が表示される', () => {
    const deferred = createDeferred()
    renderOshiMyListPage(
      { fetchOshiList: vi.fn().mockReturnValue(deferred.promise) },
      { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) }
    )
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('読み込み中です。')).toBeInTheDocument()
  })

  it('認証済みなら推しリスト取得を開始する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(dataProvider.fetchOshiList).toHaveBeenCalled()
    })
    expect(authGate.redirectToLogin).not.toHaveBeenCalled()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.fetchOshiList).not.toHaveBeenCalled()
  })

  it('取得成功で一覧を表示する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '推し動画',
            thumbnailUrl: '/thumb.png',
            seriesId: 'series-1',
            isOshi: true,
          },
        ],
      }),
      fetchFavoriteCount: vi.fn().mockResolvedValue({
        ok: true,
        data: { favoriteCount: 3 },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })
    expect(screen.getByText('お気に入り登録数: 3')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: '推し作品一覧' })
    expect(list).toHaveClass('oshi-lists__items--grid')
    expect(screen.getByRole('link', { name: '作品ページへ' })).toHaveAttribute(
      'href',
      '/series/series-1/?selectedMovieId=movie-1'
    )
    expect(screen.getByRole('button', { name: '済' })).toBeInTheDocument()
  })

  it('作品リンクのクリックで共通導線が呼び出される', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '推し動画',
            thumbnailUrl: '/thumb.png',
            seriesId: 'series-1',
            isOshi: true,
          },
        ],
      }),
      fetchFavoriteCount: vi.fn().mockResolvedValue({
        ok: true,
        data: { favoriteCount: 1 },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }
    const navigateToMovie = vi.fn()

    renderOshiMyListPage(dataProvider, authGate, navigateToMovie)

    await screen.findByText('推し動画')
    fireEvent.click(screen.getByRole('link', { name: '作品ページへ' }))

    expect(navigateToMovie).toHaveBeenCalledWith({
      seriesId: 'series-1',
      movieId: 'movie-1',
    })
  })

  it('表示形式を切り替えても一覧を維持する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '推し動画',
            thumbnailUrl: '/thumb.png',
            seriesId: 'series-1',
            isOshi: true,
          },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })

    const list = screen.getByRole('list', { name: '推し作品一覧' })
    expect(list).toHaveClass('oshi-lists__items--grid')

    fireEvent.click(screen.getByRole('button', { name: 'リスト' }))

    expect(list).toHaveClass('oshi-lists__items--list')
    expect(screen.getByText('推し動画')).toBeInTheDocument()
  })

  it('公開設定のUIを表示して更新できる', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { visibility: 'private' },
      }),
      updateVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { visibility: 'public' },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('公開設定:')).toBeInTheDocument()
    })
    expect(screen.getByText('現在: 非公開')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '公開' }))

    await waitFor(() => {
      expect(dataProvider.updateVisibility).toHaveBeenCalledWith('public')
    })
  })

  it('サムネイルが未設定でも動画URLからサムネイルを表示する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '推し動画',
            thumbnailUrl: null,
            videoUrl: 'https://youtu.be/abc123',
            seriesId: 'series-1',
            isOshi: true,
          },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    const image = await screen.findByRole('img', { name: '推し動画' })
    expect(image).toHaveAttribute(
      'src',
      'https://img.youtube.com/vi/abc123/hqdefault.jpg'
    )
  })

  it('解除操作で推へ切り替えるが一覧は維持する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '推し動画',
            thumbnailUrl: '/thumb.png',
            seriesId: 'series-1',
            isOshi: true,
          },
        ],
      }),
      toggleMovieOshi: vi.fn().mockResolvedValue({
        ok: true,
        data: { isOshi: false },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '済' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '済' }))

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '推' })).toBeInTheDocument()
    })
    expect(dataProvider.toggleMovieOshi).toHaveBeenCalledWith('movie-1')
  })

  it('推し更新イベントで一覧を再取得する', async () => {
    const dataProvider = {
      fetchOshiList: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              id: 'movie-1',
              title: '推し動画',
              thumbnailUrl: null,
              seriesId: null,
              isOshi: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              id: 'movie-2',
              title: '推し動画2',
              thumbnailUrl: null,
              seriesId: null,
              isOshi: true,
            },
          ],
        }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new Event(OSHI_LIST_UPDATED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByText('推し動画2')).toBeInTheDocument()
    })
    expect(dataProvider.fetchOshiList).toHaveBeenCalledTimes(2)
  })

  it('取得結果が空なら空状態を表示する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し登録済みの動画がありません。')).toBeInTheDocument()
    })
  })

  it('取得失敗時はエラー表示を出し一覧は表示しない', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: false, error: 'network' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiMyListPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推しリストの取得に失敗しました。')).toBeInTheDocument()
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
