import { render, screen } from '@testing-library/react'
import SeriesHeader from './SeriesHeader.jsx'

describe('SeriesHeader', () => {
  it('作品情報が取得中の間は読み込み状態を示す', () => {
    render(<SeriesHeader isLoading />)

    expect(screen.getByText('作品情報を読み込み中...')).toBeInTheDocument()
  })

  it('作品タイトルを表示する', () => {
    render(<SeriesHeader title="テスト作品" />)

    expect(screen.getByText('テスト作品')).toBeInTheDocument()
  })
})
