import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { vi } from 'vitest'
import LoginPage from './LoginPage.jsx'
import OshiListsPage from './OshiListsPage.jsx'
import UserOshiSeriesPage from './UserOshiSeriesPage.jsx'
import UserPage from './UserPage.jsx'

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
  it('未ログイン時にログイン画面へ遷移する', async () => {
    const redirectSpy = vi.fn()
    const profileProvider = { fetchUserProfile: vi.fn() }
    const listProvider = { fetchListSummary: vi.fn() }
    const seriesProvider = { fetchSeries: vi.fn() }

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
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
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
    const seriesProvider = { fetchSeries: vi.fn().mockResolvedValue({ ok: true, data: [] }) }

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
      expect(screen.getByRole('heading', { name: 'ユーザーマイページ' })).toBeInTheDocument()
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
      fetchSeries: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ seriesId: 's1', title: '銀河の旅', favoriteCount: 2, updatedAt: null }],
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
})
