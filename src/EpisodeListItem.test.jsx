import { render, screen } from '@testing-library/react'
import EpisodeListItem from './EpisodeListItem.jsx'

describe('EpisodeListItem', () => {
  it('サムネイル、タイトル、公開日を表示する', () => {
    render(
      <EpisodeListItem
        episode={{
          id: 'episode-1',
          title: '第1話',
          thumbnailUrl: '/thumb.png',
          publishedAt: '2026-01-01T00:00:00Z',
        }}
      />
    )

    expect(screen.getByRole('img', { name: '第1話のサムネイル' })).toHaveAttribute(
      'src',
      '/thumb.png'
    )
    expect(screen.getByText('第1話')).toBeInTheDocument()
    expect(screen.getByText('公開日: 2026-01-01T00:00:00Z')).toBeInTheDocument()
  })

  it('サムネイルが欠損している場合はプレースホルダを表示する', () => {
    render(
      <EpisodeListItem
        episode={{
          id: 'episode-2',
          title: '第2話',
          thumbnailUrl: null,
          publishedAt: '2026-01-02T00:00:00Z',
        }}
      />
    )

    expect(screen.getByText('サムネイルなし')).toBeInTheDocument()
  })

  it('公開日が未設定の場合は未設定であることを表示する', () => {
    render(
      <EpisodeListItem
        episode={{
          id: 'episode-3',
          title: '第3話',
          thumbnailUrl: '/thumb-3.png',
          publishedAt: null,
        }}
      />
    )

    expect(screen.getByText('公開日: 未設定')).toBeInTheDocument()
  })
})
