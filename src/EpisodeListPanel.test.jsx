import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import EpisodeListPanel from './EpisodeListPanel.jsx'

describe('EpisodeListPanel', () => {
  const episodes = [
    { id: 'episode-1', title: '第1話' },
    { id: 'episode-2', title: '第2話' },
  ]

  it('話数一覧と総数、選択状態を表示する', () => {
    const handleSelect = vi.fn()

    render(
      <EpisodeListPanel
        episodes={episodes}
        selectedEpisodeId="episode-2"
        onSelectEpisode={handleSelect}
      />
    )

    expect(screen.getByText('全2話')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第1話' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(screen.getByRole('button', { name: '第2話' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.click(screen.getByRole('button', { name: '第1話' }))
    expect(handleSelect).toHaveBeenCalledWith('episode-1')
  })

  it('話数が存在しない場合は空状態を表示する', () => {
    render(<EpisodeListPanel episodes={[]} />)

    expect(screen.getByText('話数が存在しません。')).toBeInTheDocument()
  })

  it('話数一覧の更新で総数表示が更新される', () => {
    const { rerender } = render(<EpisodeListPanel episodes={episodes} />)

    expect(screen.getByText('全2話')).toBeInTheDocument()

    rerender(<EpisodeListPanel episodes={[episodes[0]]} />)
    expect(screen.getByText('全1話')).toBeInTheDocument()
  })
})
