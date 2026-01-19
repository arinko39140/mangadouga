import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import OshiListsPage from './OshiListsPage.jsx'
import { OSHI_LIST_UPDATED_EVENT } from './oshiListEvents.js'

const renderOshiListsPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <OshiListsPage dataProvider={dataProvider} authGate={authGate} />
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

describe('OshiListsPage', () => {
  it('見出しと読み込み状態が表示される', () => {
    const deferred = createDeferred()
    renderOshiListsPage(
      { fetchOshiList: vi.fn().mockReturnValue(deferred.promise) },
      { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) }
    )
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('読み込み中です。')).toBeInTheDocument()
  })

  it('認証済みなら推し一覧の取得を開始する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(dataProvider.fetchOshiList).toHaveBeenCalled()
    })
    expect(authGate.redirectToLogin).not.toHaveBeenCalled()
  })

  it('未認証ならログインへ誘導し取得は開始しない', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn(),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: false, error: { type: 'auth_required' } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
    expect(dataProvider.fetchOshiList).not.toHaveBeenCalled()
  })

  it('取得成功で一覧を表示する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { id: 'movie-1', title: '推し動画', isOshi: true },
          { id: 'movie-2', title: '推し動画2', isOshi: true },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })
    expect(screen.getByText('推し動画2')).toBeInTheDocument()
  })

  it('取得成功時に推しのみ一覧表示する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { id: 'movie-1', title: '推し動画', isOshi: true },
          { id: 'movie-2', title: '未登録動画', isOshi: false },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })
    expect(screen.queryByText('未登録動画')).not.toBeInTheDocument()
  })

  it('表示形式の切替後も一覧を維持する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { id: 'movie-1', title: '推し動画', isOshi: true },
          { id: 'movie-2', title: '推し動画2', isOshi: true },
        ],
      }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'グリッド' }))

    expect(screen.getByText('推し動画')).toBeInTheDocument()
    expect(screen.getByText('推し動画2')).toBeInTheDocument()
    expect(dataProvider.fetchOshiList).toHaveBeenCalledTimes(1)
  })

  it('推し更新イベントで一覧を再取得する', async () => {
    const dataProvider = {
      fetchOshiList: vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          data: [{ id: 'movie-1', title: '推し動画', isOshi: true }],
        })
        .mockResolvedValueOnce({
          ok: true,
          data: [
            { id: 'movie-1', title: '推し動画', isOshi: true },
            { id: 'movie-2', title: '推し動画2', isOshi: true },
          ],
        }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し動画')).toBeInTheDocument()
    })

    await act(async () => {
      window.dispatchEvent(new Event(OSHI_LIST_UPDATED_EVENT))
    })

    await waitFor(() => {
      expect(screen.getByText('推し動画2')).toBeInTheDocument()
    })
    expect(dataProvider.fetchOshiList).toHaveBeenCalledTimes(2)
  })

  it('取得結果が空なら空状態を表示する', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('登録済みの推しがありません。')).toBeInTheDocument()
    })
  })

  it('取得失敗時はエラー表示を出し一覧は表示しない', async () => {
    const dataProvider = {
      fetchOshiList: vi.fn().mockResolvedValue({ ok: false, error: { type: 'network' } }),
    }
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }

    renderOshiListsPage(dataProvider, authGate)

    await waitFor(() => {
      expect(screen.getByText('推し一覧の取得に失敗しました。')).toBeInTheDocument()
    })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
