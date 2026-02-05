import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import WorkPage from './WorkPage.jsx'
import { OSHI_LIST_UPDATED_EVENT } from './oshiListEvents.js'

const renderWorkPage = (dataProvider, seriesId = 'series-1', authGate, historyRecorder) =>
  render(
    <MemoryRouter initialEntries={[`/series/${seriesId}/`]}>
      <Routes>
        <Route
          path="/series/:seriesId/"
          element={
            <WorkPage
              dataProvider={dataProvider}
              authGate={authGate}
              historyRecorder={historyRecorder}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  )

const renderWorkPageWithUrl = (dataProvider, url, authGate, historyRecorder) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/series/:seriesId/"
          element={
            <WorkPage
              dataProvider={dataProvider}
              authGate={authGate}
              historyRecorder={historyRecorder}
            />
          }
        />
      </Routes>
    </MemoryRouter>
  )

const LocationSpy = () => {
  const location = useLocation()
  return <p data-testid="location-search">{location.search}</p>
}

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

  it('話数選択の明示操作で履歴を記録する', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-05T10:00:00Z'))

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
    const historyRecorder = {
      recordView: vi.fn().mockResolvedValue({ ok: true, data: { historyId: 1 } }),
    }

    renderWorkPage(dataProvider, 'series-1', null, historyRecorder)

    vi.useRealTimers()
    const latestButton = await screen.findByRole('button', { name: '最新話' })
    expect(historyRecorder.recordView).not.toHaveBeenCalled()

    const oldButton = await screen.findByRole('button', { name: '第1話' })
    fireEvent.click(oldButton)

    expect(historyRecorder.recordView).toHaveBeenCalledWith(
      expect.objectContaining({
        movieId: 'movie-old',
        source: 'select',
      })
    )

    fireEvent.click(latestButton)
    expect(historyRecorder.recordView).toHaveBeenCalledWith(
      expect.objectContaining({
        movieId: 'movie-latest',
        source: 'select',
      })
    )

  })

  it('再生ボタン押下で履歴を記録する', async () => {
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
            videoUrl: 'https://www.youtube.com/watch?v=abc123',
            isOshi: false,
          },
        ],
      }),
    }
    const historyRecorder = {
      recordView: vi.fn().mockResolvedValue({ ok: true, data: { historyId: 1 } }),
    }

    renderWorkPage(dataProvider, 'series-1', null, historyRecorder)

    const playButton = await screen.findByRole('button', { name: '再生する' })
    fireEvent.click(playButton)

    await waitFor(() => {
      expect(historyRecorder.recordView).toHaveBeenCalledWith(
        expect.objectContaining({
          movieId: 'movie-latest',
          source: 'play',
        })
      )
    })
  })

  it('初期ソート順は人気で取得される', async () => {
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
      expect(dataProvider.fetchMovies).toHaveBeenCalledWith('series-99', 'popular')
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
        if (sortOrder === 'latest') {
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
              id: 'movie-popular',
              title: '人気話',
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

    const popularButton = await screen.findByRole('button', { name: '人気話' })
    expect(popularButton).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '投稿日(新しい順)' }))

    await waitFor(() => {
      expect(dataProvider.fetchMovies).toHaveBeenCalledWith('series-1', 'latest')
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

    const sortSection = screen.getByRole('region', { name: '話数一覧' })
    expect(
      await within(sortSection).findByText('並び順: 人気', { selector: 'p' })
    ).toBeInTheDocument()
    fireEvent.click(
      within(sortSection).getByRole('button', { name: '投稿日(新しい順)' })
    )

    expect(
      await within(sortSection).findByText('並び順: 投稿日(新しい順)', {
        selector: 'p',
      })
    ).toBeInTheDocument()
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
    const sortSection = screen.getByRole('region', { name: '話数一覧' })
    expect(
      within(sortSection).getByText('並び順: 投稿日(古い順)', { selector: 'p' })
    ).toBeInTheDocument()
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

    const popularButton = await screen.findByRole('button', { name: '人気' })
    expect(popularButton).toHaveAttribute('aria-pressed', 'true')
    const sortSection = screen.getByRole('region', { name: '話数一覧' })
    expect(
      within(sortSection).getByText('並び順: 人気', { selector: 'p' })
    ).toBeInTheDocument()
  })

  it('並び順の変更でURLのsortOrderが同期される', async () => {
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

    render(
      <MemoryRouter initialEntries={['/series/series-1/']}>
        <Routes>
          <Route
            path="/series/:seriesId/"
            element={
              <>
                <WorkPage dataProvider={dataProvider} />
                <LocationSpy />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'sortOrder=popular'
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '投稿日(新しい順)' }))

    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'sortOrder=latest'
      )
    })
  })

  it('ソート切替で話数一覧の表示順が更新される', async () => {
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
        if (sortOrder === 'latest') {
          return Promise.resolve({
            ok: true,
            data: [
              {
                id: 'movie-new',
                title: '新しい話',
                thumbnailUrl: null,
                publishedAt: '2026-02-01T00:00:00Z',
                videoUrl: '/video/new',
                isOshi: false,
              },
              {
                id: 'movie-old',
                title: '古い話',
                thumbnailUrl: null,
                publishedAt: '2026-01-01T00:00:00Z',
                videoUrl: '/video/old',
                isOshi: false,
              },
            ],
          })
        }
        return Promise.resolve({
          ok: true,
          data: [
            {
              id: 'movie-popular',
              title: '人気話',
              thumbnailUrl: null,
              publishedAt: '2026-01-15T00:00:00Z',
              videoUrl: '/video/popular',
              isOshi: false,
            },
            {
              id: 'movie-mid',
              title: '中間話',
              thumbnailUrl: null,
              publishedAt: '2026-01-10T00:00:00Z',
              videoUrl: '/video/mid',
              isOshi: false,
            },
          ],
        })
      }),
    }

    renderWorkPage(dataProvider, 'series-1')

    const list = await screen.findByRole('list', { name: '話数一覧のアイテム' })
    expect(list.querySelectorAll('li')[0]).toHaveTextContent('人気話')

    fireEvent.click(screen.getByRole('button', { name: '投稿日(新しい順)' }))

    await waitFor(() => {
      const items = screen
        .getByRole('list', { name: '話数一覧のアイテム' })
        .querySelectorAll('li')
      expect(items[0]).toHaveTextContent('新しい話')
    })
  })

  it('URLのsortOrderがlatestの場合は投稿日で取得して表示する', async () => {
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

    renderWorkPageWithUrl(dataProvider, '/series/series-1/?sortOrder=latest')

    await waitFor(() => {
      expect(dataProvider.fetchMovies).toHaveBeenCalledWith('series-1', 'latest')
    })
    const sortSection = screen.getByRole('region', { name: '話数一覧' })
    expect(
      await within(sortSection).findByText('並び順: 投稿日(新しい順)', {
        selector: 'p',
      })
    ).toBeInTheDocument()
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

  it('推し登録成功時に推し一覧更新イベントを送信する', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
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
            videoUrl: 'https://youtu.be/1',
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
      expect(dispatchSpy).toHaveBeenCalled()
    })
    expect(dispatchSpy.mock.calls[0][0].type).toBe(OSHI_LIST_UPDATED_EVENT)
    dispatchSpy.mockRestore()
  })

  it('推し登録失敗時は失敗通知を表示し状態を更新しない', async () => {
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
            videoUrl: 'https://youtu.be/1',
            isOshi: false,
          },
        ],
      }),
      toggleMovieOshi: vi.fn().mockResolvedValue({
        ok: false,
        error: { type: 'network' },
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
      expect(screen.getByText('推し登録に失敗しました。')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '推' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '済' })).not.toBeInTheDocument()
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
