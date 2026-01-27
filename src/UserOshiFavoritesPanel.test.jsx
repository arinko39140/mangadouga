import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UserOshiFavoritesPanel from './UserOshiFavoritesPanel.jsx'

describe('UserOshiFavoritesPanel', () => {
  it('読み込み中の状態を表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiFavoritesPanel isLoading />
      </MemoryRouter>
    )

    expect(
      screen.getByRole('heading', { name: 'お気に入り推しリスト' })
    ).toBeInTheDocument()
    expect(screen.getByText('お気に入り推しリストを読み込み中...')).toBeInTheDocument()
  })

  it('取得エラー時はエラー表示を行う', () => {
    render(
      <MemoryRouter>
        <UserOshiFavoritesPanel error="network" />
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'お気に入り推しリストの取得に失敗しました。'
    )
  })

  it('空状態のメッセージを表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiFavoritesPanel items={[]} />
      </MemoryRouter>
    )

    expect(screen.getByText('お気に入り推しリストがありません。')).toBeInTheDocument()
  })

  it('お気に入り推しリストの一覧と導線を表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiFavoritesPanel
          items={[
            { listId: 'l1', name: '星の推し', favoriteCount: 12 },
            { listId: 'l2', name: '月の推し', favoriteCount: null },
          ]}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('list', { name: 'お気に入り推しリスト' })).toBeInTheDocument()
    expect(screen.getByText('星の推し')).toBeInTheDocument()
    expect(screen.getByText('月の推し')).toBeInTheDocument()
    expect(screen.getByText('お気に入り数: 12')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'お気に入り推しリストを見る' })).toHaveAttribute(
      'href',
      '/oshi-lists/favorites/'
    )
  })

  it('非表示指定の場合はレンダリングしない', () => {
    const { container } = render(
      <MemoryRouter>
        <UserOshiFavoritesPanel isVisible={false} />
      </MemoryRouter>
    )

    expect(container.firstChild).toBeNull()
  })
})
