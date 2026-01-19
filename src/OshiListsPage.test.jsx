import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import OshiListsPage from './OshiListsPage.jsx'

const renderOshiListsPage = (dataProvider, authGate) =>
  render(
    <MemoryRouter>
      <OshiListsPage dataProvider={dataProvider} authGate={authGate} />
    </MemoryRouter>
  )

describe('OshiListsPage', () => {
  it('最小表示枠として見出しと補足文が表示される', () => {
    renderOshiListsPage(
      { fetchOshiList: vi.fn().mockResolvedValue({ ok: true, data: [] }) },
      { getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }) }
    )
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('推しリスト一覧は準備中です。')).toBeInTheDocument()
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
})
