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
      seriesProvider: { fetchSeriesList: vi.fn().mockReturnValue(seriesDeferred.promise) },
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
    const seriesProvider = { fetchSeriesList: vi.fn() }
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
    expect(seriesProvider.fetchSeriesList).not.toHaveBeenCalled()
    expect(visibilityProvider.fetchVisibility).not.toHaveBeenCalled()
  })

  it('ユーザーが存在しない場合はページ全体のエラーを表示する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({ ok: false, error: 'not_found' }),
    }
    const seriesProvider = { fetchSeriesList: vi.fn() }
    const visibilityProvider = { fetchVisibility: vi.fn() }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ユーザーが見つかりません。')
    })
    expect(seriesProvider.fetchSeriesList).not.toHaveBeenCalled()
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
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '星の物語',
            favoriteCount: 5,
            updatedAt: null,
            thumbnailUrl: 'https://example.com/thumb.jpg',
          },
        ],
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
    expect(seriesProvider.fetchSeriesList).toHaveBeenCalledWith({
      targetUserId: 'user-1',
      viewerUserId: 'viewer-1',
      sort: { key: 'favorite_count', order: 'desc' },
    })
  })

  it('再試行で全セクションを再取得する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '花音', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi
        .fn()
        .mockResolvedValueOnce({ ok: false, error: 'network' })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            {
              seriesId: 's2',
              title: '月の記憶',
              favoriteCount: 1,
              updatedAt: null,
              thumbnailUrl: null,
            },
          ],
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
    expect(seriesProvider.fetchSeriesList).toHaveBeenCalledTimes(2)
  })

  it('他ユーザー閲覧で非公開なら非公開文言のみを表示し一覧取得しない', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = { fetchSeriesList: vi.fn() }
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
    expect(seriesProvider.fetchSeriesList).not.toHaveBeenCalled()
  })

  it('可視性取得失敗時は非公開扱いで一覧取得しない', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = { fetchSeriesList: vi.fn() }
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
    expect(seriesProvider.fetchSeriesList).not.toHaveBeenCalled()
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
      fetchSeriesList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
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
      expect(seriesProvider.fetchSeriesList).toHaveBeenCalledWith({
        targetUserId: 'user-1',
        viewerUserId: 'user-1',
        sort: { key: 'favorite_count', order: 'desc' },
      })
    })
    expect(visibilityProvider.fetchVisibility).not.toHaveBeenCalled()
  })

  it('表示形式の切り替えができる', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '光の章',
            favoriteCount: 2,
            updatedAt: null,
            thumbnailUrl: null,
          },
        ],
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

    const list = await screen.findByRole('list', { name: '推し作品一覧' })
    expect(list.className).toContain('user-series-list__items--grid')

    fireEvent.click(screen.getByRole('button', { name: 'リスト' }))
    expect(list.className).toContain('user-series-list__items--list')
  })

  it('一覧でサムネイルと作品ページ導線が表示される', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '銀河の旅',
            favoriteCount: 4,
            updatedAt: null,
            thumbnailUrl: 'https://example.com/thumb.jpg',
          },
        ],
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

    expect(await screen.findByText('銀河の旅')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '銀河の旅のサムネイル' })).toHaveAttribute(
      'src',
      'https://example.com/thumb.jpg'
    )
    expect(screen.getByRole('link', { name: '作品ページへ' })).toHaveAttribute(
      'href',
      '/series/s1/'
    )
  })

  it('並べ替え操作でお気に入り数順の取得を切り替える', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '風の詩',
            favoriteCount: 3,
            updatedAt: null,
            thumbnailUrl: null,
          },
        ],
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
      expect(seriesProvider.fetchSeriesList).toHaveBeenCalledWith({
        targetUserId: 'user-1',
        viewerUserId: 'viewer-1',
        sort: { key: 'favorite_count', order: 'desc' },
      })
    })

    fireEvent.click(screen.getByRole('button', { name: '少ない順' }))

    await waitFor(() => {
      expect(seriesProvider.fetchSeriesList).toHaveBeenCalledWith({
        targetUserId: 'user-1',
        viewerUserId: 'viewer-1',
        sort: { key: 'favorite_count', order: 'asc' },
      })
    })
  })

  it('本人閲覧時は解除操作で一覧から削除する', async () => {
    resolveCurrentUserId.mockResolvedValue({ ok: true, userId: 'user-1' })
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '星の道',
            favoriteCount: 1,
            updatedAt: null,
            thumbnailUrl: null,
          },
        ],
      }),
      unregisterSeries: vi.fn().mockResolvedValue({ ok: true, data: null }),
    }
    const visibilityProvider = {
      fetchVisibility: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserOshiSeriesPage({ profileProvider, seriesProvider, visibilityProvider, authGate })

    const button = await screen.findByRole('button', { name: '解除' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(seriesProvider.unregisterSeries).toHaveBeenCalledWith({ seriesId: 's1' })
      expect(screen.getByText('推し作品がありません。')).toBeInTheDocument()
    })
  })

  it('他ユーザー閲覧時は登録操作ができる', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '海の記憶',
            favoriteCount: 2,
            updatedAt: null,
            thumbnailUrl: null,
          },
        ],
      }),
      registerSeries: vi.fn().mockResolvedValue({ ok: true, data: null }),
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

    const button = await screen.findByRole('button', { name: '登録' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(seriesProvider.registerSeries).toHaveBeenCalledWith({ seriesId: 's1' })
      expect(screen.getByRole('button', { name: '解除' })).toBeEnabled()
    })
  })
})
