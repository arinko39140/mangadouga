import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import WorkPage from './WorkPage.jsx'

const renderWorkPage = (dataProvider, seriesId = 'series-1', authGate) =>
  render(
    <MemoryRouter initialEntries={[`/series/${seriesId}/`]}>
      <Routes>
        <Route
          path="/series/:seriesId/"
          element={<WorkPage dataProvider={dataProvider} authGate={authGate} />}
        />
      </Routes>
    </MemoryRouter>
  )

const renderWorkPageWithUrl = (dataProvider, url, authGate) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/series/:seriesId/"
          element={<WorkPage dataProvider={dataProvider} authGate={authGate} />}
        />
      </Routes>
    </MemoryRouter>
  )

describe('WorkPage state', () => {
  it('初期表示で最新話を選択し、再生対象に反映する', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: 'https://youtu.be/latest',
            isOshi: false,
          },
          {
            id: 'movie-old',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: 'https://youtu.be/old',
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider)

    const latestButton = await screen.findByRole('button', { name: '最新話' })
    expect(latestButton).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByTitle('再生中: 最新話')).toBeInTheDocument()
  })

  it('話数選択の変更で再生対象が更新される', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: 'https://youtu.be/latest',
            isOshi: false,
          },
          {
            id: 'movie-old',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: 'https://youtu.be/old',
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider)

    const oldButton = await screen.findByRole('button', { name: '第1話' })
    fireEvent.click(oldButton)

    expect(oldButton).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByTitle('再生中: 第1話')).toBeInTheDocument()
  })

  it('初期ソート順は最新話で取得される', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }

    renderWorkPage(dataProvider, 'series-99')

    await waitFor(() => {
      expect(dataProvider.fetchMovies).toHaveBeenCalledWith('series-99', 'latest')
    })
  })

  it('話数一覧が空の場合は空状態を表示する', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }

    renderWorkPage(dataProvider, 'series-1')

    expect(await screen.findByText('話数が存在しません。')).toBeInTheDocument()
    expect(screen.getByText('全0話')).toBeInTheDocument()
  })

  it('並び順変更時に一覧と再生対象が一致するように更新される', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn((seriesId, sortOrder) => {
        if (sortOrder === 'oldest') {
          return Promise.resolve({
            ok: true,
            data: [
            {
              id: 'movie-oldest',
              title: '最古話',
              thumbnailUrl: null,
              publishedAt: '2024-01-01T00:00:00Z',
              videoUrl: 'https://youtu.be/oldest',
              isOshi: false,
            },
          ],
        })
      }
        return Promise.resolve({
          ok: true,
          data: [
            {
              id: 'movie-latest',
              title: '最新話',
              thumbnailUrl: null,
              publishedAt: '2026-01-01T00:00:00Z',
              videoUrl: 'https://youtu.be/latest',
              isOshi: false,
            },
            {
              id: 'movie-middle',
              title: '中間話',
              thumbnailUrl: null,
              publishedAt: '2025-06-01T00:00:00Z',
              videoUrl: 'https://youtu.be/middle',
              isOshi: false,
            },
          ],
        })
      }),
    }

    renderWorkPage(dataProvider, 'series-1')

    const latestButton = await screen.findByRole('button', { name: '最新話' })
    expect(latestButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '古い順' }))

    await waitFor(() => {
      expect(dataProvider.fetchMovies).toHaveBeenCalledWith('series-1', 'oldest')
    })

    const oldestButton = await screen.findByRole('button', { name: '最古話' })
    expect(oldestButton).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByTitle('再生中: 最古話')).toBeInTheDocument()
  })

  it('並び順の切り替えで表示ラベルが更新される', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: '/video/latest',
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider, 'series-1')

    expect(await screen.findByText('並び順: 最新話')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '古い順' }))

    expect(await screen.findByText('並び順: 古い順')).toBeInTheDocument()
  })

  it('話数一覧の更新で選択が失われた場合は先頭話数に切り替える', async () => {
    const firstProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-a',
            title: 'A話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: '/video/a',
            isOshi: false,
          },
          {
            id: 'movie-b',
            title: 'B話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: '/video/b',
            isOshi: false,
          },
        ],
      }),
    }

    const secondProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-c',
            title: 'C話',
            thumbnailUrl: null,
            publishedAt: '2026-02-01T00:00:00Z',
            videoUrl: '/video/c',
            isOshi: false,
          },
        ],
      }),
    }

    const { rerender } = render(
      <MemoryRouter initialEntries={['/series/series-1/']}>
        <Routes>
          <Route
            path="/series/:seriesId/"
            element={<WorkPage dataProvider={firstProvider} />}
          />
        </Routes>
      </MemoryRouter>
    )

    const firstButton = await screen.findByRole('button', { name: 'A話' })
    expect(firstButton).toHaveAttribute('aria-pressed', 'true')

    rerender(
      <MemoryRouter initialEntries={['/series/series-1/']}>
        <Routes>
          <Route
            path="/series/:seriesId/"
            element={<WorkPage dataProvider={secondProvider} />}
          />
        </Routes>
      </MemoryRouter>
    )

    const newButton = await screen.findByRole('button', { name: 'C話' })
    expect(newButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('全1話')).toBeInTheDocument()
  })

  it('リダイレクトのパラメータから話数選択と並び順を復元する', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-old',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: 'https://youtu.be/old',
            isOshi: false,
          },
          {
            id: 'movie-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: 'https://youtu.be/latest',
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPageWithUrl(
      dataProvider,
      '/series/series-1/?selectedMovieId=movie-old&sortOrder=oldest'
    )

    const selectedButton = await screen.findByRole('button', { name: '第1話' })
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('並び順: 古い順')).toBeInTheDocument()
    expect(await screen.findByTitle('再生中: 第1話')).toBeInTheDocument()
  })

  it('不正なパラメータは既定値へフォールバックする', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: null,
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPageWithUrl(
      dataProvider,
      '/series/series-1/?selectedMovieId=unknown&sortOrder=invalid'
    )

    const latestButton = await screen.findByRole('button', { name: '最新話' })
    expect(latestButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('並び順: 最新話')).toBeInTheDocument()
  })

  it('お気に入り操作で認証済みなら状態が更新される', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      toggleSeriesFavorite: vi.fn().mockResolvedValue({
        ok: true,
        data: { isFavorited: true },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderWorkPage(dataProvider, 'series-1', authGate)

    const button = await screen.findByRole('button', { name: /お気に入り/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(dataProvider.toggleSeriesFavorite).toHaveBeenCalledWith('series-1')
    })
    expect(screen.getByText('お気に入り: 登録済み')).toBeInTheDocument()
  })

  it('未ログインの場合はログイン導線へ誘導する', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      toggleSeriesFavorite: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderWorkPage(dataProvider, 'series-1', authGate)

    const button = await screen.findByRole('button', { name: /お気に入り/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalledWith('favorite')
    })
    expect(dataProvider.toggleSeriesFavorite).not.toHaveBeenCalled()
  })

  it('推し操作で認証済みなら状態が更新される', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: '/video/1',
            isOshi: false,
          },
        ],
      }),
      toggleMovieOshi: vi.fn().mockResolvedValue({
        ok: true,
        data: { isOshi: true },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderWorkPage(dataProvider, 'series-1', authGate)

    const oshiButton = await screen.findByRole('button', { name: '推' })
    fireEvent.click(oshiButton)

    await waitFor(() => {
      expect(dataProvider.toggleMovieOshi).toHaveBeenCalledWith('movie-1')
    })
    expect(screen.getByRole('button', { name: '済' })).toBeInTheDocument()
  })

  it('推し解除で一覧上の表示が推に戻る', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: '/video/1',
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

    renderWorkPage(dataProvider, 'series-1', authGate)

    const oshiButton = await screen.findByRole('button', { name: '済' })
    fireEvent.click(oshiButton)

    await waitFor(() => {
      expect(dataProvider.toggleMovieOshi).toHaveBeenCalledWith('movie-1')
    })
    expect(screen.getByRole('button', { name: '推' })).toBeInTheDocument()
  })

  it('未ログインの場合は推し操作でログイン導線へ誘導する', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: '/video/1',
            isOshi: false,
          },
        ],
      }),
      toggleMovieOshi: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderWorkPage(dataProvider, 'series-1', authGate)

    const oshiButton = await screen.findByRole('button', { name: '推' })
    fireEvent.click(oshiButton)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalledWith('oshi')
    })
    expect(dataProvider.toggleMovieOshi).not.toHaveBeenCalled()
  })

  it('推し登録済みの初期状態を表示する', async () => {
    const dataProvider = {
      fetchSeriesOverview: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          id: 'series-1',
          title: 'テスト作品',
          favoriteCount: 0,
          isFavorited: false,
        },
      }),
      fetchMovies: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'movie-1',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: '/video/1',
            isOshi: true,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider, 'series-1')

    expect(await screen.findByRole('button', { name: '済' })).toBeInTheDocument()
  })
})
