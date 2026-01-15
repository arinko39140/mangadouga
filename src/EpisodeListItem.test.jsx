import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
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
          isOshi: false,
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
          isOshi: false,
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
          isOshi: false,
        }}
      />
    )

    expect(screen.getByText('公開日: 未設定')).toBeInTheDocument()
  })

  it('推し未登録の場合は推を表示し、操作でコールバックを呼び出す', () => {
    const handleToggle = vi.fn()

    render(
      <EpisodeListItem
        episode={{
          id: 'episode-4',
          title: '第4話',
          thumbnailUrl: '/thumb-4.png',
          publishedAt: '2026-01-03T00:00:00Z',
          isOshi: false,
        }}
        onToggleOshi={handleToggle}
      />
    )

    const button = screen.getByRole('button', { name: '推' })
    fireEvent.click(button)

    expect(handleToggle).toHaveBeenCalledWith('episode-4')
  })

  it('推し登録済みの場合は済を表示する', () => {
    render(
      <EpisodeListItem
        episode={{
          id: 'episode-5',
          title: '第5話',
          thumbnailUrl: '/thumb-5.png',
          publishedAt: '2026-01-04T00:00:00Z',
          isOshi: true,
        }}
      />
    )

    expect(screen.getByRole('button', { name: '済' })).toBeInTheDocument()
  })
})
