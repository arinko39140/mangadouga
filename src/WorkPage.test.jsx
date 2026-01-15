import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import WorkPage from './WorkPage.jsx'

const renderWorkPage = (dataProvider, seriesId = 'series-1') =>
  render(
    <MemoryRouter initialEntries={[`/series/${seriesId}/`]}>
      <Routes>
        <Route
          path="/series/:seriesId/"
          element={<WorkPage dataProvider={dataProvider} />}
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
      fetchEpisodes: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'episode-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: null,
            isOshi: false,
          },
          {
            id: 'episode-old',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: null,
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider)

    const latestButton = await screen.findByRole('button', { name: '最新話' })
    expect(latestButton).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('再生中: 最新話')).toBeInTheDocument()
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
      fetchEpisodes: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'episode-latest',
            title: '最新話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: null,
            isOshi: false,
          },
          {
            id: 'episode-old',
            title: '第1話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: null,
            isOshi: false,
          },
        ],
      }),
    }

    renderWorkPage(dataProvider)

    const oldButton = await screen.findByRole('button', { name: '第1話' })
    fireEvent.click(oldButton)

    expect(oldButton).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText('再生中: 第1話')).toBeInTheDocument()
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
      fetchEpisodes: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }

    renderWorkPage(dataProvider, 'series-99')

    await waitFor(() => {
      expect(dataProvider.fetchEpisodes).toHaveBeenCalledWith('series-99', 'latest')
    })
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
      fetchEpisodes: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'episode-a',
            title: 'A話',
            thumbnailUrl: null,
            publishedAt: '2026-01-01T00:00:00Z',
            videoUrl: null,
            isOshi: false,
          },
          {
            id: 'episode-b',
            title: 'B話',
            thumbnailUrl: null,
            publishedAt: '2025-12-01T00:00:00Z',
            videoUrl: null,
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
      fetchEpisodes: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            id: 'episode-c',
            title: 'C話',
            thumbnailUrl: null,
            publishedAt: '2026-02-01T00:00:00Z',
            videoUrl: null,
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
})
