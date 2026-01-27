import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UserOshiListPanel from './UserOshiListPanel.jsx'

describe('UserOshiListPanel', () => {
  it('読み込み中の状態を表示する', () => {
    render(<UserOshiListPanel isLoading />)

    expect(screen.getByRole('heading', { name: '推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('推しリストを読み込み中...')).toBeInTheDocument()
  })

  it('取得エラー時はエラー表示を行う', () => {
    render(<UserOshiListPanel error="network" />)

    expect(screen.getByRole('alert')).toHaveTextContent('推しリストの取得に失敗しました。')
  })

  it('非公開時は非公開メッセージを表示する', () => {
    render(
      <UserOshiListPanel
        summary={{ listId: null, status: 'private', favoriteCount: null, isFavorited: false }}
      />
    )

    expect(screen.getByText('この推しリストは非公開です。')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('未作成時は空状態を表示する', () => {
    render(
      <UserOshiListPanel
        summary={{ listId: null, status: 'none', favoriteCount: null, isFavorited: false }}
      />
    )

    expect(screen.getByText('推しリストがありません。')).toBeInTheDocument()
  })

  it('公開中の推しリストはお気に入り操作を表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiListPanel
          summary={{ listId: '1', status: 'public', favoriteCount: 12, isFavorited: false }}
          onToggleFavorite={() => {}}
        />
      </MemoryRouter>
    )

    expect(screen.getByText('お気に入り数: 12')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: 'お気に入り登録' })
    expect(button).toBeEnabled()
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('link', { name: '推しリストを見る' })).toHaveAttribute(
      'href',
      '/oshi-lists/1/'
    )
  })

  it('未ログイン時はお気に入り操作を無効化する', () => {
    render(
      <MemoryRouter>
        <UserOshiListPanel
          isAuthenticated={false}
          summary={{ listId: '1', status: 'public', favoriteCount: 1, isFavorited: true }}
        />
      </MemoryRouter>
    )

    const button = screen.getByRole('button', { name: '登録済み' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('お気に入り数が不明な場合は件数を表示しない', () => {
    render(
      <MemoryRouter>
        <UserOshiListPanel
          summary={{ listId: '1', status: 'public', favoriteCount: null, isFavorited: false }}
        />
      </MemoryRouter>
    )

    expect(screen.queryByText(/お気に入り数/)).not.toBeInTheDocument()
  })
})
