import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import TopPage from './TopPage.jsx'

const renderTopPage = (props = {}) =>
  render(
    <MemoryRouter>
      <TopPage {...props} />
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

  it('推しリスト導線のリンク先が推しリストページである', () => {
    renderTopPage()

    expect(screen.getByRole('link', { name: '推しリスト一覧へ' })).toHaveAttribute(
      'href',
      '/oshi-lists/'
    )
  })

  it('JST基準の現在曜日が初期選択になり、一覧が表示される', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T15:00:00Z'))

    renderTopPage()

    const selectedButton = screen.getByRole('button', { name: '火' })
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('火曜日の一覧')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('曜日を選択すると選択状態と一覧が切り替わる', () => {
    renderTopPage()

    const targetButton = screen.getByRole('button', { name: '土' })
    fireEvent.click(targetButton)

    const selectedButtons = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')

    expect(selectedButtons).toHaveLength(1)
    expect(selectedButtons[0]).toBe(targetButton)
    expect(screen.getByText('土曜日の一覧')).toBeInTheDocument()
  })

  it('取得データが曜日別一覧に反映され、人気順で表示される', async () => {
    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            weekday: 'mon',
            items: [
              { id: 'm1', title: '人気一位', popularityScore: 200 },
              { id: 'm2', title: '人気二位', popularityScore: 120 },
            ],
          },
          { weekday: 'tue', items: [] },
          { weekday: 'wed', items: [] },
          { weekday: 'thu', items: [] },
          { weekday: 'fri', items: [] },
          { weekday: 'sat', items: [] },
          { weekday: 'sun', items: [] },
        ],
      }),
    }

    renderTopPage({ dataProvider })

    fireEvent.click(screen.getByRole('button', { name: '月' }))

    await screen.findByText('人気一位')
    const list = screen.getByRole('list', { name: '曜日別一覧のアイテム' })
    const items = list.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('人気一位')
    expect(items[1]).toHaveTextContent('人気二位')
  })

  it('読み込み中はローディング状態を表示する', () => {
    const dataProvider = {
      fetchWeekdayLists: vi.fn(
        () =>
          new Promise(() => {
            // keep pending for loading state
          })
      ),
    }

    renderTopPage({ dataProvider })

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('取得失敗時はエラー状態を表示する', async () => {
    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({ ok: false, error: 'network' }),
    }

    renderTopPage({ dataProvider })

    expect(await screen.findByText('通信エラーが発生しました。')).toBeInTheDocument()
  })

  it('一覧が空の場合は空状態を表示する', async () => {
    const emptyLists = [
      { weekday: 'mon', items: [] },
      { weekday: 'tue', items: [] },
      { weekday: 'wed', items: [] },
      { weekday: 'thu', items: [] },
      { weekday: 'fri', items: [] },
      { weekday: 'sat', items: [] },
      { weekday: 'sun', items: [] },
    ]
    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({ ok: true, data: emptyLists }),
    }

    renderTopPage({ dataProvider })

    expect(
      await screen.findByText('表示できる一覧がありません。')
    ).toBeInTheDocument()
  })
})
