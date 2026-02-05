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

  it('ルート/oshi-lists/catalog/でみんなの推しリストが表示される', () => {
    renderWithRoute('/oshi-lists/catalog/')
    expect(
      screen.getByRole('heading', { name: 'みんなの推しリスト' })
    ).toBeInTheDocument()
  })

  it('ルート/oshi-lists/:listId/で推しリスト詳細が表示される', () => {
    renderWithRoute('/oshi-lists/1/')
    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
  })

  it('ルート/oshi-lists/favorites/でお気に入り推しリストが表示される', () => {
    renderWithRoute('/oshi-lists/favorites/')
    expect(
      screen.getByRole('heading', { name: 'お気に入り推しリスト' })
    ).toBeInTheDocument()
  })

  it('ルート/login/でログイン画面が表示される', () => {
    renderWithRoute('/login/')
    expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('ルート/users/:userId/でマイページが表示される', () => {
    renderWithRoute('/users/user-1/')
    expect(screen.getByRole('heading', { name: 'マイページ' })).toBeInTheDocument()
  })

  it('ルート/users/:userId/oshi-series/で推し作品一覧ページが表示される', () => {
    renderWithRoute('/users/user-1/oshi-series/')
    expect(
      screen.getByRole('heading', { level: 1, name: '推し作品一覧' })
    ).toBeInTheDocument()
  })

  it('ルート/history/で閲覧履歴ページが表示される', () => {
    renderWithRoute('/history/')
    expect(screen.getByRole('heading', { name: '閲覧履歴' })).toBeInTheDocument()
  })

  it('対象ページ以外ではユーザー情報セクションを表示しない', () => {
    renderWithRoute('/login/')
    expect(screen.queryByRole('heading', { name: 'ユーザー情報' })).toBeNull()
  })
})
