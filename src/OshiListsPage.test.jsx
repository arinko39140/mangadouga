import { render, screen } from '@testing-library/react'
import OshiListsPage from './OshiListsPage.jsx'

describe('OshiListsPage', () => {
  it('最小表示枠として見出しと補足文が表示される', () => {
    render(<OshiListsPage />)
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('推しリスト一覧は準備中です。')).toBeInTheDocument()
  })
})
