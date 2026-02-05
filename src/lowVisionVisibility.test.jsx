import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import HistoryPage from './HistoryPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'
import TopPage from './TopPage.jsx'

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

const renderHistoryPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <HistoryPage dataProvider={dataProvider} authGate={authGate} />
    </MemoryRouter>
  )

describe('低視力向けの視認性と状態表現', () => {
  it('画像プレースホルダーが可読性クラスを持つ', async () => {
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
                publishedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                thumbnailUrl: null,
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
              publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              thumbnailUrl: null,
            },
          ],
        },
      }),
    }

    renderTopPage(dataProvider)

    const topPlaceholders = await screen.findAllByText('サムネイルなし')
    expect(topPlaceholders[0]).toHaveClass('media-text')

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
            userId: null,
            name: '推しリスト',
            favoriteCount: 3,
            isFavorited: false,
            visibility: 'public',
            iconUrl: null,
          },
        ],
      }),
    }

    renderOshiListsPage(listProvider, authGate)

    const avatarPlaceholder = await screen.findByText('?')
    expect(avatarPlaceholder).toHaveClass('media-text')

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

    const historyPlaceholder = await screen.findByText('サムネイル準備中')
    expect(historyPlaceholder).toHaveClass('media-text')
  })

  it('状態変化がバッジとテキストで表現される', async () => {
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
            isFavorited: true,
            visibility: 'public',
            iconUrl: null,
          },
        ],
      }),
    }

    renderOshiListsPage(listProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('済')).toBeInTheDocument()
    })
    expect(screen.getByText('済')).toHaveClass('state-badge')
  })
})
