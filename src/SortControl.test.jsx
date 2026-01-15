import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import SortControl from './SortControl.jsx'

describe('SortControl', () => {
  it('現在の並び順が分かるように表示する', () => {
    render(<SortControl sortOrder="latest" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '最新話' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: '古い順' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })

  it('並び順の選択でコールバックを呼び出す', () => {
    const handleChange = vi.fn()

    render(<SortControl sortOrder="latest" onChange={handleChange} />)

    fireEvent.click(screen.getByRole('button', { name: '古い順' }))
    expect(handleChange).toHaveBeenCalledWith('oldest')
  })
})
