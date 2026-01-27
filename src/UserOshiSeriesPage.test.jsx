import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import UserOshiSeriesPage from './UserOshiSeriesPage.jsx'
import { resolveCurrentUserId } from './supabaseSession.js'

vi.mock('./supabaseSession.js', () => ({
  resolveCurrentUserId: vi.fn(),
}))

const renderUserOshiSeriesPage = ({
  profileProvider,
  seriesProvider,
  authGate,
  visibilityProvider,
  userId = 'user-1',
} = {}) =>
  render(
    <MemoryRouter initialEntries={[`/users/${userId}/oshi-series/`]}>
      <Routes>
        <Route
          path="/users/:userId/oshi-series/"
          element={
            <UserOshiSeriesPage
              profileProvider={profileProvider}
              seriesProvider={seriesProvider}
              visibilityProvider={visibilityProvider}
              authGate={authGate}
            />
          }
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

describe('UserOshiSeriesPage', () => {
  beforeEach(() => {
    resolveCurrentUserId.mockResolvedValue({ ok: true, userId: 'viewer-1' })
  })

  it('見出しと読み込み状態が表示される', () => {
    const profileDeferred = createDeferred()
    const seriesDeferred = createDeferred()

    renderUserOshiSeriesPage({
      profileProvider: { fetchUserProfile: vi.fn().mockReturnValue(profileDeferred.promise) },
      seriesProvider: { fetchSeries: vi.fn().mockReturnValue(seriesDeferred.promise) },
      visibilityProvider: {
        fetchVisibility: vi.fn().mockResolvedValue({
          ok: true,
          data: { oshiList: 'public', oshiSeries: 'public' },
        }),
      },
      authGate: { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) },
    })

    expect(screen.getAllByRole('heading', { name: '推し作品一覧' })).toHaveLength(2)
    expect(screen.getByText('ユーザー情報を読み込み中...')).toBeInTheDocument()
    expect(screen.getByText('推し作品を読み込み中...')).toBeInTheDocument()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const profileProvider = { fetchUserProfile: vi.fn() }
    const seriesProvider = { fetchSeries: vi.fn() }
    const visibilityProvider = { fetchVisibility: vi.fn() }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(profileProvider.fetchUserProfile).not.toHaveBeenCalled()
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
    expect(visibilityProvider.fetchVisibility).not.toHaveBeenCalled()
  })

  it('ユーザーが存在しない場合はページ全体のエラーを表示する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({ ok: false, error: 'not_found' }),
    }
    const seriesProvider = { fetchSeries: vi.fn() }
    const visibilityProvider = { fetchVisibility: vi.fn() }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ユーザーが見つかりません。')
    })
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
    expect(visibilityProvider.fetchVisibility).not.toHaveBeenCalled()
  })

  it('取得成功でユーザー情報と推し作品を表示する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          userId: 'user-1',
          name: '美咲',
          iconUrl: null,
          links: [
            { category: 'x', url: 'https://x.com/misaki', label: 'X公式' },
          ],
        },
      }),
    }
    const seriesProvider = {
      fetchSeries: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ seriesId: 's1', title: '星の物語', favoriteCount: 5, updatedAt: null }],
      }),
    }
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { oshiList: 'public', oshiSeries: 'public' },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(screen.getAllByText('美咲').length).toBeGreaterThan(0)
    })
    expect(screen.getByRole('link', { name: 'X公式' })).toHaveAttribute(
      'href',
      'https://x.com/misaki'
    )
    expect(screen.getByText('星の物語')).toBeInTheDocument()
    expect(profileProvider.fetchUserProfile).toHaveBeenCalledWith('user-1')
    expect(seriesProvider.fetchSeries).toHaveBeenCalledWith('user-1')
  })

  it('再試行で全セクションを再取得する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '花音', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeries: vi
        .fn()
        .mockResolvedValueOnce({ ok: false, error: 'network' })
        .mockResolvedValueOnce({
          ok: true,
          data: [{ seriesId: 's2', title: '月の記憶', favoriteCount: 1, updatedAt: null }],
        }),
    }
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { oshiList: 'public', oshiSeries: 'public' },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(screen.getByText('推し作品の取得に失敗しました。')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    await waitFor(() => {
      expect(screen.getByText('月の記憶')).toBeInTheDocument()
    })
    expect(profileProvider.fetchUserProfile).toHaveBeenCalledTimes(2)
    expect(seriesProvider.fetchSeries).toHaveBeenCalledTimes(2)
  })

  it('他ユーザー閲覧で非公開なら非公開文言のみを表示し一覧取得しない', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = { fetchSeries: vi.fn() }
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { oshiList: 'public', oshiSeries: 'private' },
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(screen.getByText('この推し作品は非公開です。')).toBeInTheDocument()
    })
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
  })

  it('可視性取得失敗時は非公開扱いで一覧取得しない', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = { fetchSeries: vi.fn() }
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({ ok: false, error: 'network' }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(screen.getByText('この推し作品は非公開です。')).toBeInTheDocument()
    })
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
  })

  it('本人閲覧なら可視性取得せず一覧取得する', async () => {
    resolveCurrentUserId.mockResolvedValue({ ok: true, userId: 'user-1' })
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeries: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const visibilityProvider = {
      fetchVisibility: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(seriesProvider.fetchSeries).toHaveBeenCalledWith('user-1')
    })
    expect(visibilityProvider.fetchVisibility).not.toHaveBeenCalled()
  })
})
