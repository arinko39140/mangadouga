import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import UserPage from './UserPage.jsx'
import { createUserPageProvider } from './userPageProvider.js'

const renderUserPage = ({
  profileProvider,
  listProvider,
  seriesProvider,
  authGate,
  userId = 'user-1',
} = {}) =>
  render(
    <MemoryRouter initialEntries={[`/users/${userId}/`]}>
      <Routes>
        <Route
          path="/users/:userId/"
          element={
            <UserPage
              profileProvider={profileProvider}
              listProvider={listProvider}
              seriesProvider={seriesProvider}
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

const buildUserSupabaseMock = ({ userRows = [], userError = null } = {}) => {
  const limitMock = vi.fn().mockResolvedValue({ data: userRows, error: userError })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn((table) => {
    if (table === 'users') {
      return { select: selectMock }
    }
    return { select: vi.fn() }
  })

  return {
    client: { from: fromMock },
  }
}

describe('UserPage', () => {
  it('見出しと読み込み状態が表示される', () => {
    const profileDeferred = createDeferred()
    const listDeferred = createDeferred()
    const seriesDeferred = createDeferred()

    renderUserPage({
      profileProvider: { fetchUserProfile: vi.fn().mockReturnValue(profileDeferred.promise) },
      listProvider: { fetchListSummary: vi.fn().mockReturnValue(listDeferred.promise) },
      seriesProvider: { fetchSeries: vi.fn().mockReturnValue(seriesDeferred.promise) },
      authGate: { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) },
    })

    expect(screen.getByRole('heading', { name: 'ユーザー情報' })).toBeInTheDocument()
    expect(screen.getByText('ユーザー情報を読み込み中...')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('推しリストを読み込み中...')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '推し作品一覧' })).toBeInTheDocument()
    expect(screen.getByText('推し作品を読み込み中...')).toBeInTheDocument()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const profileProvider = { fetchUserProfile: vi.fn() }
    const listProvider = { fetchListSummary: vi.fn() }
    const seriesProvider = { fetchSeries: vi.fn() }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(profileProvider.fetchUserProfile).not.toHaveBeenCalled()
    expect(listProvider.fetchListSummary).not.toHaveBeenCalled()
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
  })

  it('ユーザーが存在しない場合はページ全体のエラーを表示する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({ ok: false, error: 'not_found' }),
    }
    const listProvider = { fetchListSummary: vi.fn() }
    const seriesProvider = { fetchSeries: vi.fn() }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ユーザーが見つかりません。')
    })
    expect(listProvider.fetchListSummary).not.toHaveBeenCalled()
    expect(seriesProvider.fetchSeries).not.toHaveBeenCalled()
  })

  it('取得成功でユーザー情報と推し一覧を表示する', async () => {
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
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: 'list-1', status: 'public', favoriteCount: 2, isFavorited: true },
      }),
      toggleFavorite: vi.fn(),
    }
    const seriesProvider = {
      fetchSeries: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ seriesId: 's1', title: '星の物語', favoriteCount: 5, updatedAt: null }],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(screen.getAllByText('美咲')).toHaveLength(2)
    })
    expect(screen.getByRole('link', { name: 'X公式' })).toHaveAttribute(
      'href',
      'https://x.com/misaki'
    )
    expect(screen.getByText('お気に入り数: 2')).toBeInTheDocument()
    expect(screen.getByText('星の物語')).toBeInTheDocument()
    expect(profileProvider.fetchUserProfile).toHaveBeenCalledWith('user-1')
    expect(listProvider.fetchListSummary).toHaveBeenCalledWith('user-1')
    expect(seriesProvider.fetchSeries).toHaveBeenCalledWith('user-1')
  })

  it('ユーザー情報取得後に外部リンクと推し作品の取得を開始する', async () => {
    const listDeferred = createDeferred()
    const seriesDeferred = createDeferred()
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          userId: 'user-1',
          name: '凛',
          iconUrl: null,
          links: [{ category: 'x', url: 'https://x.com/rin', label: 'Xリンク' }],
        },
      }),
    }
    const listProvider = { fetchListSummary: vi.fn().mockReturnValue(listDeferred.promise) }
    const seriesProvider = { fetchSeries: vi.fn().mockReturnValue(seriesDeferred.promise) }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(profileProvider.fetchUserProfile).toHaveBeenCalledWith('user-1')
    })
    expect(listProvider.fetchListSummary).toHaveBeenCalledWith('user-1')
    expect(seriesProvider.fetchSeries).toHaveBeenCalledWith('user-1')
    expect(screen.getByRole('link', { name: 'Xリンク' })).toHaveAttribute(
      'href',
      'https://x.com/rin'
    )

    listDeferred.resolve({
      ok: true,
      data: { listId: 'list-3', status: 'public', favoriteCount: 0, isFavorited: false },
    })
    seriesDeferred.resolve({
      ok: true,
      data: [{ seriesId: 's-1', title: '銀河の旅', favoriteCount: 3, updatedAt: null }],
    })

    await waitFor(() => {
      expect(screen.getByText('銀河の旅')).toBeInTheDocument()
    })
  })

  it('非公開リストではお気に入り操作が無効になる', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '遥', iconUrl: null, links: [] },
      }),
    }
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: null, status: 'private', favoriteCount: null, isFavorited: false },
      }),
      toggleFavorite: vi.fn(),
    }
    const seriesProvider = {
      fetchSeries: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(screen.getByText('この推しリストは非公開です。')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('無効な外部リンクはユーザーページに表示されない', async () => {
    const { client } = buildUserSupabaseMock({
      userRows: [
        {
          user_id: 'user-1',
          name: '莉子',
          icon_url: null,
          x_url: 'https://x.com/riko',
          x_label: '有効リンク',
          youtube_url: 'ftp://example.com/invalid',
          youtube_label: '無効リンク',
          other_url: '',
          other_label: '',
        },
      ],
    })
    const profileProvider = createUserPageProvider(client)
    const listProvider = {
      fetchListSummary: vi.fn().mockResolvedValue({
        ok: true,
        data: { listId: null, status: 'none', favoriteCount: null, isFavorited: false },
      }),
    }
    const seriesProvider = { fetchSeries: vi.fn().mockResolvedValue({ ok: true, data: [] }) }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '有効リンク' })).toHaveAttribute(
        'href',
        'https://x.com/riko'
      )
    })
    expect(screen.queryByRole('link', { name: '無効リンク' })).not.toBeInTheDocument()
  })

  it('再試行で全セクションを再取得する', async () => {
    const profileProvider = {
      fetchUserProfile: vi.fn().mockResolvedValue({
        ok: true,
        data: { userId: 'user-1', name: '花音', iconUrl: null, links: [] },
      }),
    }
    const listProvider = {
      fetchListSummary: vi
        .fn()
        .mockResolvedValueOnce({ ok: false, error: 'network' })
        .mockResolvedValueOnce({
          ok: true,
          data: { listId: 'list-2', status: 'public', favoriteCount: 1, isFavorited: false },
        }),
    }
    const seriesProvider = {
      fetchSeries: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderUserPage({ profileProvider, listProvider, seriesProvider, authGate })

    await waitFor(() => {
      expect(screen.getByText('推しリストの取得に失敗しました。')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    await waitFor(() => {
      expect(screen.getByText('お気に入り数: 1')).toBeInTheDocument()
    })
    expect(profileProvider.fetchUserProfile).toHaveBeenCalledTimes(2)
    expect(listProvider.fetchListSummary).toHaveBeenCalledTimes(2)
    expect(seriesProvider.fetchSeries).toHaveBeenCalledTimes(2)
  })
})
