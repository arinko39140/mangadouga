import { render, screen } from '@testing-library/react'
import PlaybackPanel from './PlaybackPanel.jsx'

describe('PlaybackPanel', () => {
  it('再生準備中の状態を表示する', () => {
    render(<PlaybackPanel isLoading />)

    expect(screen.getByText('再生準備中...')).toBeInTheDocument()
  })

  it('選択話数のタイトルを表示する', () => {
    render(
      <PlaybackPanel
        isLoading={false}
        episode={{ id: 'e1', title: '第1話', videoUrl: '/video' }}
      />
    )

    expect(screen.getByText('再生中: 第1話')).toBeInTheDocument()
  })

  it('動画URLが未設定の場合は代替表示を行う', () => {
    render(
      <PlaybackPanel
        isLoading={false}
        episode={{ id: 'e1', title: '第1話', videoUrl: null }}
      />
    )

    expect(screen.getByText('動画URLが未設定です。')).toBeInTheDocument()
  })
})
