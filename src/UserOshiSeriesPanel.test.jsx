import { render, screen } from '@testing-library/react'
import UserOshiSeriesPanel from './UserOshiSeriesPanel.jsx'

describe('UserOshiSeriesPanel', () => {
  it('読み込み中の状態を表示する', () => {
    render(<UserOshiSeriesPanel isLoading />)

    expect(screen.getByRole('heading', { name: '推し作品一覧' })).toBeInTheDocument()
    expect(screen.getByText('推し作品を読み込み中...')).toBeInTheDocument()
  })

  it('取得エラー時はエラー表示を行う', () => {
    render(<UserOshiSeriesPanel error="network" />)

    expect(screen.getByRole('alert')).toHaveTextContent('推し作品の取得に失敗しました。')
  })

  it('空状態のメッセージを表示する', () => {
    render(<UserOshiSeriesPanel items={[]} />)

    expect(screen.getByText('推し作品がありません。')).toBeInTheDocument()
  })

  it('推し作品の一覧を表示する', () => {
    render(
      <UserOshiSeriesPanel
        items={[
          { seriesId: 's1', title: '星の物語', favoriteCount: 10 },
          { seriesId: 's2', title: '月の記憶', favoriteCount: null },
        ]}
      />
    )

    expect(screen.getByRole('list', { name: '推し作品一覧' })).toBeInTheDocument()
    expect(screen.getByText('星の物語')).toBeInTheDocument()
    expect(screen.getByText('月の記憶')).toBeInTheDocument()
    expect(screen.getByText('お気に入り数: 10')).toBeInTheDocument()
  })
})
