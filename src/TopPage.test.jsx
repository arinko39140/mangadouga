import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import TopPage from './TopPage.jsx'

const LocationDisplay = () => {
  const location = useLocation()
  return <p data-testid="location-search">{location.search}</p>
}

const buildEmptyLists = () => [
  { weekday: 'mon', items: [] },
  { weekday: 'tue', items: [] },
  { weekday: 'wed', items: [] },
  { weekday: 'thu', items: [] },
  { weekday: 'fri', items: [] },
  { weekday: 'sat', items: [] },
  { weekday: 'sun', items: [] },
]

const renderTopPage = ({ routerEntries = ['/'], showLocation = false, ...props } = {}) =>
  render(
    <MemoryRouter initialEntries={routerEntries}>
      <TopPage {...props} />
      {showLocation ? <LocationDisplay /> : null}
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

  it('曜日ナビゲーションは全曜日と「すべて」を表示し、選択状態が識別できる', () => {
    renderTopPage()

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    const buttons = within(nav).getAllByRole('button')
    expect(buttons).toHaveLength(8)

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

  it('推しリスト導線からみんなの推しリストページへ遷移できる', () => {
    renderTopPage()

    const link = screen.getByRole('link', { name: 'みんなの推しリスト一覧へ' })
    expect(link).toHaveAttribute('href', '/oshi-lists/catalog/')
  })

  it('推しリスト導線のリンク先がみんなの推しリストページである', () => {
    renderTopPage()

    expect(screen.getByRole('link', { name: 'みんなの推しリスト一覧へ' })).toHaveAttribute(
      'href',
      '/oshi-lists/catalog/'
    )
  })

  it('推しリスト導線から推しリストページへ遷移できる', () => {
    renderTopPage()

    const link = screen.getByRole('link', { name: '推しリストへ' })
    expect(link).toHaveAttribute('href', '/oshi-lists/')
  })

  it('JST基準の現在曜日が初期選択になり、一覧が表示される', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T15:00:00Z'))

    renderTopPage()

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    const selectedButton = within(nav).getByRole('button', { name: '火' })
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('火曜日の一覧')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('曜日とソートの選択状態が同時に表示される', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T15:00:00Z'))

    renderTopPage()

    expect(screen.getByText('表示中: 火曜日 / 人気')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('URLのsortOrder指定があっても既定は人気になりURLが同期される', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T15:00:00Z'))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({ ok: true, data: buildEmptyLists() }),
    }

    renderTopPage({
      dataProvider,
      routerEntries: ['/?sortOrder=latest'],
      showLocation: true,
    })

    expect(screen.getByText('表示中: 火曜日 / 人気')).toBeInTheDocument()

    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'sortOrder=popular'
      )
    })
  })

  it('ソート変更後も曜日切替でソートが維持される', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T15:00:00Z'))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({ ok: true, data: buildEmptyLists() }),
    }

    renderTopPage({ dataProvider, showLocation: true })

    const listSection = screen.getByRole('region', { name: '曜日別一覧' })
    fireEvent.click(
      within(listSection).getByRole('button', { name: '投稿日(新しい順)' })
    )

    expect(screen.getByText('表示中: 火曜日 / 投稿日(新しい順)')).toBeInTheDocument()
    vi.useRealTimers()
    await waitFor(() => {
      expect(screen.getByTestId('location-search')).toHaveTextContent(
        'sortOrder=latest'
      )
    })

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    fireEvent.click(within(nav).getByRole('button', { name: '土' }))

    expect(screen.getByText('表示中: 土曜日 / 投稿日(新しい順)')).toBeInTheDocument()
  })

  it('曜日を選択すると選択状態と一覧が切り替わる', () => {
    renderTopPage()

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    const targetButton = within(nav).getByRole('button', { name: '土' })
    fireEvent.click(targetButton)

    const selectedButtons = within(nav)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-pressed') === 'true')

    expect(selectedButtons).toHaveLength(1)
    expect(selectedButtons[0]).toBe(targetButton)
    expect(screen.getByText('土曜日の一覧')).toBeInTheDocument()
  })

  it('「すべて」を選択すると全曜日の一覧が表示される', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            weekday: 'mon',
            items: [
              {
                id: 'm1',
                title: '月の動画',
                popularityScore: 120,
                seriesId: 'series-1',
                publishedAt: '2026-01-19T10:00:00Z',
              },
            ],
          },
          {
            weekday: 'tue',
            items: [
              {
                id: 'm2',
                title: '火の動画',
                popularityScore: 99,
                seriesId: 'series-2',
                publishedAt: '2026-01-18T10:00:00Z',
              },
            ],
          },
          { weekday: 'wed', items: [] },
          { weekday: 'thu', items: [] },
          { weekday: 'fri', items: [] },
          { weekday: 'sat', items: [] },
          { weekday: 'sun', items: [] },
        ],
      }),
    }

    renderTopPage({ dataProvider })

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    fireEvent.click(within(nav).getByRole('button', { name: 'すべて' }))

    vi.useRealTimers()
    await screen.findByText('月の動画')
    await screen.findByText('火の動画')
    expect(screen.getByText('すべての一覧')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: '曜日別一覧のアイテム' })
    const items = list.querySelectorAll('li')

    expect(items).toHaveLength(2)
    expect(screen.getByText('月の動画')).toBeInTheDocument()
    expect(screen.getByText('火の動画')).toBeInTheDocument()
  })

  it('「すべて」選択時は100件まで表示される', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const makeItems = (prefix, count) =>
      Array.from({ length: count }, (_, index) => ({
        id: `${prefix}-${index}`,
        title: `${prefix}の動画${index + 1}`,
        popularityScore: count - index,
        seriesId: `series-${prefix}-${index}`,
        publishedAt: '2026-01-19T10:00:00Z',
      }))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          { weekday: 'mon', items: makeItems('mon', 60) },
          { weekday: 'tue', items: makeItems('tue', 60) },
          { weekday: 'wed', items: [] },
          { weekday: 'thu', items: [] },
          { weekday: 'fri', items: [] },
          { weekday: 'sat', items: [] },
          { weekday: 'sun', items: [] },
        ],
      }),
    }

    renderTopPage({ dataProvider })

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    fireEvent.click(within(nav).getByRole('button', { name: 'すべて' }))

    vi.useRealTimers()
    await screen.findByText('すべての一覧')
    const list = screen.getByRole('list', { name: '曜日別一覧のアイテム' })
    const items = list.querySelectorAll('li')

    expect(items).toHaveLength(100)
  })

  it('取得データが曜日別一覧に反映され、人気順で表示される', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            weekday: 'mon',
            items: [
              {
                id: 'm1',
                title: '人気一位',
                popularityScore: 200,
                seriesId: 'series-1',
                publishedAt: '2026-01-19T10:00:00Z',
              },
              {
                id: 'm2',
                title: '人気二位',
                popularityScore: 120,
                seriesId: 'series-2',
                publishedAt: '2026-01-18T10:00:00Z',
              },
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

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    fireEvent.click(within(nav).getByRole('button', { name: '月' }))

    vi.useRealTimers()
    await screen.findByText('人気一位')
    const list = screen.getByRole('list', { name: '曜日別一覧のアイテム' })
    const items = list.querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('人気一位')
    expect(items[1]).toHaveTextContent('人気二位')
    expect(screen.getByRole('link', { name: '人気一位' })).toHaveAttribute(
      'href',
      '/series/series-1/'
    )
  })

  it('過去1週間より前のアイテムは曜日別一覧に表示しない', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            weekday: 'mon',
            items: [
              {
                id: 'm1',
                title: '最近の作品',
                popularityScore: 200,
                seriesId: 'series-1',
                publishedAt: '2026-01-19T10:00:00Z',
              },
              {
                id: 'm2',
                title: '古い作品',
                popularityScore: 999,
                seriesId: 'series-2',
                publishedAt: '2026-01-10T10:00:00Z',
              },
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

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    fireEvent.click(within(nav).getByRole('button', { name: '月' }))

    vi.useRealTimers()
    await screen.findByText('最近の作品')
    expect(screen.queryByText('古い作品')).not.toBeInTheDocument()
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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

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

    vi.useRealTimers()
    expect(await screen.findByText('火曜日の一覧がありません。')).toBeInTheDocument()
  })

  it('選択した曜日に該当がない場合は空状態を明示する', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const dataProvider = {
      fetchWeekdayLists: vi.fn().mockResolvedValue({
        ok: true,
        data: [
          {
            weekday: 'mon',
            items: [
              {
                id: 'm1',
                title: '月の動画',
                popularityScore: 120,
                seriesId: 'series-1',
                publishedAt: '2026-01-19T10:00:00Z',
              },
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

    const nav = screen.getByRole('navigation', { name: '曜日ナビゲーション' })
    fireEvent.click(within(nav).getByRole('button', { name: '火' }))

    vi.useRealTimers()
    expect(await screen.findByText('火曜日の一覧がありません。')).toBeInTheDocument()
    expect(screen.queryByText('月の動画')).not.toBeInTheDocument()
  })
})
