import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import HistoryPage from './HistoryPage.jsx'

const renderHistoryPage = (authGate) =>
  render(
    <MemoryRouter>
      <HistoryPage authGate={authGate} />
    </MemoryRouter>
  )

describe('HistoryPage', () => {
  it('見出しと読み込み状態が表示される', async () => {
    const authGate = {
      getStatus: vi.fn().mockResolvedValue({ ok: true, status: { isAuthenticated: true } }),
      redirectToLogin: vi.fn(),
    }
    renderHistoryPage(authGate)

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
    renderHistoryPage(authGate)

    await waitFor(() => {
      expect(authGate.redirectToLogin).toHaveBeenCalled()
    })
  })
})
