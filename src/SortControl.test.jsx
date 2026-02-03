import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import SortControl from './SortControl.jsx'

describe('SortControl', () => {
  it('現在の並び順が分かるように表示する', () => {
    render(<SortControl sortOrder="popular" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '人気' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '投稿日(新しい順)' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('並び順の選択でコールバックを呼び出す', () => {
    const handleChange = vi.fn()

    render(<SortControl sortOrder="popular" onChange={handleChange} />)

    fireEvent.click(screen.getByRole('button', { name: '投稿日(新しい順)' }))
    expect(handleChange).toHaveBeenCalledWith('latest')
  })

  it('並び順の値に応じて選択状態を更新する', () => {
    render(<SortControl sortOrder="oldest" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '投稿日(古い順)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
