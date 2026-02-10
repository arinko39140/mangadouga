import { render, screen } from '@testing-library/react'
import PlaybackPanel from './PlaybackPanel.jsx'

describe('PlaybackPanel', () => {
  it('再生準備中の状態を表示する', () => {
    render(<PlaybackPanel isLoading />)

    expect(screen.getByText('再生準備中...')).toBeInTheDocument()
  })

  it('YouTubeのURLがあれば埋め込み再生を表示する', () => {
    render(
      <PlaybackPanel
        isLoading={false}
        episode={{
          id: 'e1',
          title: '第1話',
          videoUrl: 'https://www.youtube.com/watch?v=abc123',
        }}
      />
    )

    const iframe = screen.getByTitle('再生中: 第1話')
    const src = iframe.getAttribute('src')
    expect(src).toMatch(/^https:\\/\\/www\\.youtube\\.com\\/embed\\/abc123/)
    const url = new URL(src)
    expect(url.searchParams.get('enablejsapi')).toBe('1')
    expect(url.searchParams.get('playsinline')).toBe('1')
    expect(url.searchParams.get('origin')).toBe(window.location.origin)
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

  it('YouTube以外のURLはフォールバック表示にする', () => {
    render(
      <PlaybackPanel
        isLoading={false}
        episode={{ id: 'e1', title: '第1話', videoUrl: 'https://example.com/video' }}
      />
    )

    expect(screen.getByText('対応していない動画URLです。')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '元の動画を開く' })).toHaveAttribute(
      'href',
      'https://example.com/video'
    )
  })
})
