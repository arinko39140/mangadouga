import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import HistoryPage from './HistoryPage.jsx'

const renderHistoryPage = ({ authGate, dataProvider, navigateToMovie } = {}) =>
  render(
    <MemoryRouter>
      <HistoryPage
        authGate={authGate}
        dataProvider={dataProvider}
        navigateToMovie={navigateToMovie}
      />
    </MemoryRouter>
  )

describe('HistoryPage', () => {
  it('見出しと読み込み状態が表示される', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }
    renderHistoryPage({ authGate })

    expect(screen.getByRole('heading', { name: '閲覧履歴' })).toBeInTheDocument()
    expect(screen.getByText('読み込み中です。')).toBeInTheDocument()
    await waitFor(() => {
      expect(authGate.getStatus).toHaveBeenCalled()
    })
  })

  it('未認証ならログインへ誘導する', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }
    renderHistoryPage({ authGate })

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
  })

  it('認証状態がfalseならログインへ誘導し履歴取得しない', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({
        ok: true,
        status: { isAuthenticated: false },
      }),
      redirectToLogin: vi.fn(),
    }
    const dataProvider = {
      fetchHistory: vi.fn(),
    }

    renderHistoryPage({ authGate, dataProvider })

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.fetchHistory).not.toHaveBeenCalled()
    expect(screen.queryByRole('list', { name: '閲覧履歴一覧' })).not.toBeInTheDocument()
  })

  it('履歴がある場合は一覧を表示する', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }
    const dataProvider = {
      fetchHistory: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            historyId: 1,
            movieId: 'movie-1',
            seriesId: 'series-1',
            title: 'サンプル動画',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            clickedAt: '2026-02-04T10:00:00Z',
            favoriteCount: 12,
            isOshi: true,
          },
        ],
      }),
    }

    renderHistoryPage({ authGate, dataProvider })

    expect(await screen.findByText('サンプル動画')).toBeInTheDocument()
    expect(screen.getByAltText('サンプル動画')).toBeInTheDocument()
    expect(screen.getByText('最終閲覧: 2026-02-04T10:00:00Z')).toBeInTheDocument()
    expect(screen.getByText('推し数: 12')).toBeInTheDocument()
    expect(screen.getByLabelText('推しバッジ')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '話数ページへ' })
    expect(link).toHaveAttribute('href', '/series/series-1/?selectedMovieId=movie-1')
  })

  it('履歴リンククリックで共通導線が呼び出される', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }
    const dataProvider = {
      fetchHistory: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            historyId: 1,
            movieId: 'movie-1',
            seriesId: 'series-1',
            title: 'サンプル動画',
            thumbnailUrl: null,
            clickedAt: '2026-02-04T10:00:00Z',
            favoriteCount: 12,
            isOshi: false,
          },
        ],
      }),
    }
    const navigateToMovie = vi.fn()

    renderHistoryPage({ authGate, dataProvider, navigateToMovie })

    await screen.findByText('サンプル動画')
    fireEvent.click(screen.getByRole('link', { name: '話数ページへ' }))

    expect(navigateToMovie).toHaveBeenCalledWith({
      seriesId: 'series-1',
      movieId: 'movie-1',
    })
  })

  it('履歴がない場合は空状態とトップ導線を表示する', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }
    const dataProvider = {
      fetchHistory: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }

    renderHistoryPage({ authGate, dataProvider })

    expect(await screen.findByText('閲覧履歴がありません。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'トップページへ戻る' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '閲覧履歴一覧' })).not.toBeInTheDocument()
  })
})
