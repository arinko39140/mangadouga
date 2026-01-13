import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TopPage from './TopPage.jsx'

const renderTopPage = () =>
  render(
    <MemoryRouter>
      <TopPage />
    </MemoryRouter>
  )

describe('TopPage layout', () => {
  it('主要エリア（ナビ・一覧・導線）が区分されて表示される', () => {
    renderTopPage()

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
    renderTopPage()

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)

    const selected = buttons.find((button) => button.getAttribute('aria-pressed') === 'true')
    expect(selected).toBeTruthy()
  })

  it('曜日一覧枠と推しリスト導線が見た目で区別できる', () => {
    renderTopPage()

    const listPanel = screen.getByRole('region', { name: '曜日別一覧' })
    const listLink = screen.getByRole('complementary', { name: '推しリスト導線' })

    expect(listPanel).toHaveClass('top-page__list--panel')
    expect(listLink).toHaveClass('top-page__link--cta')
  })

  it('推しリスト導線から推しリストページへ遷移できる', () => {
    renderTopPage()

    const link = screen.getByRole('link', { name: '推しリスト一覧へ' })
    expect(link).toHaveAttribute('href', '/oshi-lists/')
  })
})
