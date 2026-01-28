import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { vi } from 'vitest'
import LoginPage from './LoginPage.jsx'
import OshiFavoritesPage from './OshiFavoritesPage.jsx'
import OshiListPage from './OshiListPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'
import UserOshiSeriesPage from './UserOshiSeriesPage.jsx'
import UserPage from './UserPage.jsx'
import { resolveCurrentUserId } from './supabaseSession.js'

vi.mock('./supabaseSession.js', () => ({
  resolveCurrentUserId: vi.fn(),
}))

const UserPageWithRedirect = ({ profileProvider, listProvider, seriesProvider, redirectSpy }) => {
  const navigate = useNavigate()
  const authGate = useMemo(
    () => ({
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: () => {
        redirectSpy?.()
        navigate('/login/')
      },
    }),
    [navigate, redirectSpy]
  )

  return (
    <UserPage
      profileProvider={profileProvider}
      listProvider={listProvider}
      seriesProvider={seriesProvider}
      authGate={authGate}
    />
  )
}

const buildOkAuthGate = () => ({
  getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
  redirectToLogin: vi.fn(),
})

describe('ユーザーページ導線のE2E/UI', () => {
  beforeEach(() => {
    resolveCurrentUserId.mockResolvedValue({ ok: true, userId: 'user-1' })
  })

  it('未ログイン時にログイン画面へ遷移する', async () => {
    const redirectSpy = vi.fn()
    const profileProvider = { fetchUserProfile: vi.fn() }
    const listProvider = { fetchListSummary: vi.fn() }
    const seriesProvider = { fetchSeriesSummary: vi.fn() }

    render(
      <MemoryRouter initialEntries={['/users/user-1/']}>
        <Routes>
          <Route
            path="/users/:userId/"
            element={
              <UserPageWithRedirect
                profileProvider={profileProvider}
                listProvider={listProvider}
                seriesProvider={seriesProvider}
                redirectSpy={redirectSpy}
              />
            }
          />
          <Route path="/login/" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    })
    expect(redirectSpy).toHaveBeenCalled()
    expect(profileProvider.fetchUserProfile).not.toHaveBeenCalled()
    expect(listProvider.fetchListSummary).not.toHaveBeenCalled()
    expect(seriesProvider.fetchSeriesSummary).not.toHaveBeenCalled()
  })

  it('みんなの推しリストからユーザーページに遷移できる', async () => {
    const dataProvider = {
      fetchCatalog: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            listId: '1',
            userId: 'user-1',
            name: '美咲',
            favoriteCount: 3,
            isFavorited: false,
            visibility: 'public',
          },
        ],
      }),
    }
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '美咲', iconUrl: null, links: [] },
      }),
    }
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: null, status: 'none', favoriteCount: null, isFavorited: false },
      }),
    }
    const seriesProvider = {
      fetchSeriesSummary: vi.fn().mockResolvedValue({ ok: true, data: { items: [] } }),
    }

    render(
      <MemoryRouter initialEntries={['/oshi-lists/catalog/']}>
        <Routes>
          <Route
            path="/oshi-lists/catalog/"
            element={<OshiListsPage dataProvider={dataProvider} authGate={buildOkAuthGate()} />}
          />
          <Route
            path="/users/:userId/"
            element={
              <UserPage
                profileProvider={profileProvider}
                listProvider={listProvider}
                seriesProvider={seriesProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )

    const userLink = await screen.findByRole('link', { name: '美咲' })
    fireEvent.click(userLink)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'マイページ' })).toBeInTheDocument()
    })
  })

  it('推し作品一覧ページで一覧が表示される', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '凛', iconUrl: null, links: [] },
      }),
    }
    const seriesProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '銀河の旅',
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

    render(
      <MemoryRouter initialEntries={['/users/user-1/oshi-series/']}>
        <Routes>
          <Route
            path="/users/:userId/oshi-series/"
            element={
              <UserOshiSeriesPage
                profileProvider={profileProvider}
                seriesProvider={seriesProvider}
                visibilityProvider={visibilityProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('銀河の旅')).toBeInTheDocument()
    })
  })

  it('推しリスト導線から推しリストページへ遷移できる', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '凛', iconUrl: null, links: [] },
      }),
    }
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: 'list-1', status: 'public', favoriteCount: 1, isFavorited: false },
      }),
    }
    const seriesProvider = {
      fetchSeriesSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          items: [{ seriesId: 's1', title: '星の旅', favoriteCount: 2, updatedAt: null }],
        },
      }),
    }
    const favoritesProvider = {
      fetchFavoritesSummary: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const listPageProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { name: '推しリスト', favoriteCount: 1, visibility: 'public', isFavorited: false },
      }),
      fetchListItems: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      fetchVisibility: vi.fn().mockResolvedValue({ ok: true, data: { visibility: 'public' } }),
    }

    render(
      <MemoryRouter initialEntries={['/users/user-1/']}>
        <Routes>
          <Route
            path="/users/:userId/"
            element={
              <UserPage
                profileProvider={profileProvider}
                listProvider={listProvider}
                seriesProvider={seriesProvider}
                favoritesProvider={favoritesProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
          <Route
            path="/oshi-lists/:listId/"
            element={<OshiListPage dataProvider={listPageProvider} authGate={buildOkAuthGate()} />}
          />
        </Routes>
      </MemoryRouter>
    )

    const listLink = await screen.findByRole('link', { name: '推しリストを見る' })
    fireEvent.click(listLink)

    await waitFor(() => {
      expect(screen.getByText('推し作品がありません。')).toBeInTheDocument()
    })
  })

  it('推し作品導線から推し作品ページへ遷移できる', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '凛', iconUrl: null, links: [] },
      }),
    }
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: 'list-1', status: 'public', favoriteCount: 1, isFavorited: false },
      }),
    }
    const seriesProvider = {
      fetchSeriesSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          items: [{ seriesId: 's1', title: '星の旅', favoriteCount: 2, updatedAt: null }],
        },
      }),
    }
    const favoritesProvider = {
      fetchFavoritesSummary: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const seriesPageProvider = {
      fetchSeriesList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            seriesId: 's1',
            title: '星の旅',
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

    render(
      <MemoryRouter initialEntries={['/users/user-1/']}>
        <Routes>
          <Route
            path="/users/:userId/"
            element={
              <UserPage
                profileProvider={profileProvider}
                listProvider={listProvider}
                seriesProvider={seriesProvider}
                favoritesProvider={favoritesProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
          <Route
            path="/users/:userId/oshi-series/"
            element={
              <UserOshiSeriesPage
                profileProvider={profileProvider}
                seriesProvider={seriesPageProvider}
                visibilityProvider={visibilityProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )

    const seriesLink = await screen.findByRole('link', { name: 'もっと見る' })
    fireEvent.click(seriesLink)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: '推し作品一覧', level: 1 })
      ).toBeInTheDocument()
    })
  })

  it('お気に入り推しリスト導線から専用ページへ遷移できる', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '凛', iconUrl: null, links: [] },
      }),
    }
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: 'list-1', status: 'public', favoriteCount: 1, isFavorited: false },
      }),
    }
    const seriesProvider = {
      fetchSeriesSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          items: [{ seriesId: 's1', title: '星の旅', favoriteCount: 2, updatedAt: null }],
        },
      }),
    }
    const favoritesProvider = {
      fetchFavoritesSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ listId: 'fav-1', name: '推しまとめ', favoriteCount: 2 }],
      }),
    }
    const favoritesPageProvider = {
      fetchFavorites: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ listId: 'fav-1', name: '推しまとめ', favoriteCount: 2, isFavorited: true }],
      }),
    }

    render(
      <MemoryRouter initialEntries={['/users/user-1/']}>
        <Routes>
          <Route
            path="/users/:userId/"
            element={
              <UserPage
                profileProvider={profileProvider}
                listProvider={listProvider}
                seriesProvider={seriesProvider}
                favoritesProvider={favoritesProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
          <Route
            path="/oshi-lists/favorites/"
            element={
              <OshiFavoritesPage
                dataProvider={favoritesPageProvider}
                authGate={buildOkAuthGate()}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    )

    const favoritesLink = await screen.findByRole('link', {
      name: 'お気に入り推しリストを見る',
    })
    fireEvent.click(favoritesLink)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'お気に入り推しリスト', level: 1 })
      ).toBeInTheDocument()
    })
  })
})
