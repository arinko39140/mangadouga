import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRouter from './AppRouter.jsx'

const renderWithRoute = (initialEntry) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppRouter />
    </MemoryRouter>
  )

describe('AppRouter', () => {
  it('ルート/でトップページが表示される', () => {
    renderWithRoute('/')
    expect(screen.getByRole('heading', { name: 'トップページ' })).toBeInTheDocument()
  })

  it('ルート/oshi-lists/で推しリストが表示される', () => {
    renderWithRoute('/oshi-lists/')
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
  })
})
