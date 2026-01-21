import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import UserOshiSeriesPanel from './UserOshiSeriesPanel.jsx'

describe('UserOshiSeriesPanel', () => {
  it('読み込み中の状態を表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiSeriesPanel isLoading />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: '推し作品一覧' })).toBeInTheDocument()
    expect(screen.getByText('推し作品を読み込み中...')).toBeInTheDocument()
  })

  it('取得エラー時はエラー表示を行う', () => {
    render(
      <MemoryRouter>
        <UserOshiSeriesPanel error="network" />
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toHaveTextContent('推し作品の取得に失敗しました。')
  })

  it('空状態のメッセージを表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiSeriesPanel items={[]} />
      </MemoryRouter>
    )

    expect(screen.getByText('推し作品がありません。')).toBeInTheDocument()
  })

  it('推し作品の一覧を表示する', () => {
    render(
      <MemoryRouter>
        <UserOshiSeriesPanel
          userId="user-1"
          items={[
            { seriesId: 's1', title: '星の物語', favoriteCount: 10 },
            { seriesId: 's2', title: '月の記憶', favoriteCount: null },
          ]}
        />
      </MemoryRouter>
    )

    expect(screen.getByRole('list', { name: '推し作品一覧' })).toBeInTheDocument()
    expect(screen.getByText('星の物語')).toBeInTheDocument()
    expect(screen.getByText('月の記憶')).toBeInTheDocument()
    expect(screen.getByText('お気に入り数: 10')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'もっと見る' })).toHaveAttribute(
      'href',
      '/users/user-1/oshi-series/'
    )
  })
})
