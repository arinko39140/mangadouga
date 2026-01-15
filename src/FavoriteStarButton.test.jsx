import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import FavoriteStarButton from './FavoriteStarButton.jsx'

describe('FavoriteStarButton', () => {
  it('お気に入り未登録の状態を表示する', () => {
    render(<FavoriteStarButton isFavorited={false} />)

    expect(screen.getByText('お気に入り: 未登録')).toBeInTheDocument()
  })

  it('お気に入り登録済みの状態を表示する', () => {
    render(<FavoriteStarButton isFavorited />)

    expect(screen.getByText('お気に入り: 登録済み')).toBeInTheDocument()
  })

  it('クリックで操作ハンドラを呼び出す', () => {
    const handleToggle = vi.fn()
    render(<FavoriteStarButton isFavorited={false} onToggle={handleToggle} />)

    fireEvent.click(screen.getByRole('button', { name: /お気に入り/ }))

    expect(handleToggle).toHaveBeenCalled()
  })
})
