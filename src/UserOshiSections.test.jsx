import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import UserOshiSections from './UserOshiSections.jsx'

const buildSection = (label, content) => (
  <section>
    <h2>{label}</h2>
    {content ? <p>{content}</p> : null}
  </section>
)

describe('UserOshiSections', () => {
  it('本人閲覧時は推しリスト→推し作品→お気に入り推しリストの順序で表示する', () => {
    const visibilityProvider = { fetchVisibility: vi.fn() }

    render(
      <UserOshiSections
        viewerUserId="user-1"
        targetUserId="user-1"
        visibilityProvider={visibilityProvider}
        listPanel={buildSection('推しリスト', 'LIST_CONTENT')}
        seriesPanel={buildSection('推し作品一覧', 'SERIES_CONTENT')}
        favoritesPanel={buildSection('お気に入り推しリスト', 'FAVORITES_CONTENT')}
      />
    )

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['推しリスト', '推し作品一覧', 'お気に入り推しリスト'])
    expect(screen.getByText('FAVORITES_CONTENT')).toBeInTheDocument()
    expect(visibilityProvider.fetchVisibility).not.toHaveBeenCalled()
  })

  it('他ユーザー閲覧時は非公開セクションの内容を表示せず非公開文言を出す', async () => {
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { oshiList: 'private', oshiSeries: 'private' },
      }),
    }

    render(
      <UserOshiSections
        viewerUserId="viewer-1"
        targetUserId="target-1"
        visibilityProvider={visibilityProvider}
        listPanel={buildSection('推しリスト', 'LIST_CONTENT')}
        seriesPanel={buildSection('推し作品一覧', 'SERIES_CONTENT')}
        favoritesPanel={buildSection('お気に入り推しリスト', 'FAVORITES_CONTENT')}
      />
    )

    expect(await screen.findAllByText('非公開')).toHaveLength(2)
    expect(screen.queryByText('LIST_CONTENT')).not.toBeInTheDocument()
    expect(screen.queryByText('SERIES_CONTENT')).not.toBeInTheDocument()
    expect(screen.queryByText('FAVORITES_CONTENT')).not.toBeInTheDocument()
  })

  it('他ユーザー閲覧時に公開セクションは内容を表示する', async () => {
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { oshiList: 'public', oshiSeries: 'public' },
      }),
    }

    render(
      <UserOshiSections
        viewerUserId="viewer-1"
        targetUserId="target-1"
        visibilityProvider={visibilityProvider}
        listPanel={buildSection('推しリスト', 'LIST_CONTENT')}
        seriesPanel={buildSection('推し作品一覧', 'SERIES_CONTENT')}
        favoritesPanel={buildSection('お気に入り推しリスト', 'FAVORITES_CONTENT')}
      />
    )

    expect(await screen.findByText('LIST_CONTENT')).toBeInTheDocument()
    expect(screen.getByText('SERIES_CONTENT')).toBeInTheDocument()
    expect(screen.queryByText('非公開')).not.toBeInTheDocument()
    expect(screen.queryByText('FAVORITES_CONTENT')).not.toBeInTheDocument()
    expect(visibilityProvider.fetchVisibility).toHaveBeenCalledWith({ targetUserId: 'target-1' })
  })

  it('非公開セクションがあっても他セクションの表示は維持される', async () => {
    const visibilityProvider = {
      fetchVisibility: vi.fn().mockResolvedValue({
        ok: true,
        data: { oshiList: 'private', oshiSeries: 'public' },
      }),
    }

    render(
      <UserOshiSections
        viewerUserId="viewer-1"
        targetUserId="target-1"
        visibilityProvider={visibilityProvider}
        listPanel={buildSection('推しリスト', 'LIST_CONTENT')}
        seriesPanel={buildSection('推し作品一覧', 'SERIES_CONTENT')}
        favoritesPanel={buildSection('お気に入り推しリスト', 'FAVORITES_CONTENT')}
      />
    )

    expect(await screen.findByText('SERIES_CONTENT')).toBeInTheDocument()
    expect(screen.getByText('非公開')).toBeInTheDocument()
    expect(screen.queryByText('LIST_CONTENT')).not.toBeInTheDocument()
    expect(screen.queryByText('FAVORITES_CONTENT')).not.toBeInTheDocument()
  })
})
