import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import HistoryPage from './HistoryPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'
import TopPage from './TopPage.jsx'
import WorkPage from './WorkPage.jsx'

const renderTopPage = (dataProvider) =>
  render(
    <MemoryRouter>
      <TopPage dataProvider={dataProvider} />
    </MemoryRouter>
  )

const renderOshiListsPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <OshiListsPage dataProvider={dataProvider} authGate={authGate} />
    </MemoryRouter>
  )

const renderWorkPage = (dataProvider) =>
  render(
    <MemoryRouter initialEntries={['/series/series-1/']}>
      <Routes>
        <Route path="/series/:seriesId/" element={<WorkPage dataProvider={dataProvider} />} />
      </Routes>
    </MemoryRouter>
  )

const renderHistoryPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <HistoryPage dataProvider={dataProvider} authGate={authGate} />
    </MemoryRouter>
  )

describe('重点ページのカード/ナビ/レイアウト整合性', () => {
  it('TopPageの一覧が共通カードレイアウトとカード表現を使用する', async () => {
    const now = Date.now()
    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            weekday: 'thu',
            items: [
              {
                id: 't1',
                title: 'サンプル動画',
                popularityScore: 10,
                seriesId: 'series-1',
                publishedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
              },
            ],
          },
          { weekday: 'mon', items: [] },
          { weekday: 'tue', items: [] },
          { weekday: 'wed', items: [] },
          { weekday: 'fri', items: [] },
          { weekday: 'sat', items: [] },
          { weekday: 'sun', items: [] },
        ],
      }),
      fetchWeekdayItems: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          items: [
            {
              id: 'r1',
              title: '最近の動画',
              popularityScore: 12,
              seriesId: 'series-2',
              publishedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
            },
          ],
        },
      }),
    }

    renderTopPage(dataProvider)

    const weekdayList = await screen.findByRole('list', { name: '曜日別一覧のアイテム' })
    expect(weekdayList).toHaveClass('card-collection')
    expect(weekdayList).toHaveClass('card-collection--grid')

    const recentList = await screen.findByRole('list', { name: '過去100件のアイテム' })
    expect(recentList).toHaveClass('card-collection')
    expect(recentList).toHaveClass('card-collection--grid')

    const recentCard = within(recentList).getByText('最近の動画').closest('.top-page__work-card')
    expect(recentCard).toBeTruthy()
    expect(recentCard).toHaveClass('card-primary')

  })

  it('OshiListsPage/HistoryPageが共通カードレイアウトを使用する', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    const listProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            listId: '1',
            userId: 'user-1',
            name: '推しリスト',
            favoriteCount: 3,
            isFavorited: false,
            visibility: 'public',
          },
        ],
      }),
    }

    renderOshiListsPage(listProvider, authGate)

    const oshiList = await screen.findByRole('list', { name: '推しリスト一覧' })
    expect(oshiList).toHaveClass('card-collection')
    expect(oshiList).toHaveClass('card-collection--grid')
    expect(screen.getByText('推しリスト').closest('.oshi-lists__card')).toHaveClass(
      'card-primary'
    )

    const historyProvider = {
      fetchHistory: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            historyId: 1,
            movieId: 'movie-1',
            seriesId: 'series-1',
            title: '履歴動画',
            thumbnailUrl: null,
            clickedAt: '2026-02-04T10:00:00Z',
            favoriteCount: 12,
            isOshi: true,
          },
        ],
      }),
    }

    renderHistoryPage(historyProvider, authGate)

    const historyList = await screen.findByRole('list', { name: '閲覧履歴一覧' })
    expect(historyList).toHaveClass('card-collection')
    expect(historyList).toHaveClass('card-collection--grid')
    expect(screen.getByText('履歴動画').closest('.history-card')).toHaveClass(
      'card-secondary'
    )
  })

  it('WorkPageの話数一覧が共通カードレイアウトを使用する', async () => {
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
            title: '話数カード',
            thumbnailUrl: null,
            publishedAt: '2026-02-01T00:00:00Z',
            videoUrl: 'https://youtu.be/sample',
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider)

    const episodeList = await screen.findByRole('list', { name: '話数一覧のアイテム' })
    expect(episodeList).toHaveClass('card-collection')
    expect(episodeList).toHaveClass('card-collection--grid')

    const episodeCard = screen.getByText('話数カード').closest('.work-page__episode-card')
    expect(episodeCard).toHaveClass('card-primary')
  })
})
