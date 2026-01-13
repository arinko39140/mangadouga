import { render, screen } from '@testing-library/react'
import TopPage from './TopPage.jsx'

describe('TopPage layout', () => {
  it('主要エリア（ナビ・一覧・導線）が区分されて表示される', () => {
    render(<TopPage />)

    expect(
      screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: '曜日別一覧' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: '推しリスト導線' })
    ).toBeInTheDocument()
  })

  it('曜日ナビゲーションは7曜日を表示し、選択状態が識別できる', () => {
    render(<TopPage />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)

    const selected = buttons.find((button) => button.getAttribute('aria-pressed') === 'true')
    expect(selected).toBeTruthy()
  })
})
