import { describe, expect, it, vi } from 'vitest'
import { createWeekdayDataProvider, WEEKDAY_KEYS } from './weekdayDataProvider.js'

const buildSupabaseMock = (rows) => {
  const orderMock = vi.fn().mockResolvedValue({ data: rows, error: null })
  const gteMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ gte: gteMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, gteMock, orderMock },
  }
}

const buildSupabaseErrorMock = (error) => {
  const orderMock = vi.fn().mockResolvedValue({ data: null, error })
  const gteMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ gte: gteMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, gteMock, orderMock },
  }
}

const buildWeekdayItemsSupabaseMock = ({ rows = [], error = null } = {}) => {
  const rangeMock = vi.fn().mockResolvedValue({ data: rows, error })
  const orderMock = vi.fn().mockReturnValue({ range: rangeMock })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const notMock = vi.fn().mockReturnValue({ eq: eqMock, order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ not: notMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, notMock, eqMock, orderMock, rangeMock },
  }
}

describe('WeekdayDataProvider', () => {
  it('曜日指定時はweekdayで絞り込み、update降順で最新100件を取得する', async () => {
    const rows = [
      {
        movie_id: 'm1',
        movie_title: '月曜のレター',
        url: '/movies/m1',
        favorite_count: 120,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
    ]
    const { client, calls } = buildWeekdayItemsSupabaseMock({ rows })
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayItems({ weekday: 'mon', sortOrder: 'latest' })

    expect(calls.fromMock).toHaveBeenCalledWith('movie')
    expect(calls.selectMock).toHaveBeenCalled()
    expect(calls.selectMock.mock.calls[0][0]).toContain('favorite_count')
    expect(calls.selectMock.mock.calls[0][0]).toContain('update')
    expect(calls.notMock).toHaveBeenCalledWith('update', 'is', null)
    expect(calls.eqMock).toHaveBeenCalledWith('weekday', 'mon')
    expect(calls.orderMock).toHaveBeenCalledWith('update', { ascending: false })
    expect(calls.rangeMock).toHaveBeenCalledWith(0, 99)

    expect(result).toEqual({
      ok: true,
      data: {
        weekday: 'mon',
        items: [
          expect.objectContaining({
            id: 'm1',
            title: '月曜のレター',
            publishedAt: '2026-01-19T10:00:00Z',
            weekday: 'mon',
          }),
        ],
      },
    })
  })

  it('all指定時はweekday条件を付けずに取得する', async () => {
    const rows = [
      {
        movie_id: 'm1',
        movie_title: '全曜日の動画',
        url: '/movies/m1',
        favorite_count: 10,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'fri',
      },
    ]
    const { client, calls } = buildWeekdayItemsSupabaseMock({ rows })
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayItems({ weekday: 'all', sortOrder: 'latest' })

    expect(calls.eqMock).not.toHaveBeenCalled()
    expect(result.ok).toBe(true)
    expect(result.data.weekday).toBe('all')
  })

  it('updateがnullの行は一覧に含めない', async () => {
    const rows = [
      {
        movie_id: 'm1',
        movie_title: '更新なし',
        url: '/movies/m1',
        favorite_count: 10,
        update: null,
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 'm2',
        movie_title: '更新あり',
        url: '/movies/m2',
        favorite_count: 10,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
    ]
    const { client } = buildWeekdayItemsSupabaseMock({ rows })
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayItems({ weekday: 'mon', sortOrder: 'latest' })

    expect(result.ok).toBe(true)
    expect(result.data.items).toHaveLength(1)
    expect(result.data.items[0].title).toBe('更新あり')
  })

  it('人気順は最新100件内でfavorite_count降順に並び替え、同値はupdate降順で解消する', async () => {
    const rows = [
      {
        movie_id: 'm1',
        movie_title: '人気低め',
        url: '/movies/m1',
        favorite_count: 10,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 'm2',
        movie_title: '人気上位',
        url: '/movies/m2',
        favorite_count: 50,
        update: '2026-01-18T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 'm3',
        movie_title: '人気上位（新しい）',
        url: '/movies/m3',
        favorite_count: 50,
        update: '2026-01-20T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
    ]
    const { client, calls } = buildWeekdayItemsSupabaseMock({ rows })
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayItems({ weekday: 'mon', sortOrder: 'popular' })

    expect(calls.orderMock).toHaveBeenCalledWith('update', { ascending: false })
    expect(calls.rangeMock).toHaveBeenCalledWith(0, 99)
    expect(result.ok).toBe(true)
    expect(result.data.items.map((item) => item.id)).toEqual(['m3', 'm2', 'm1'])
  })

  it('未対応のsortOrderは人気順として扱う', async () => {
    const rows = [
      {
        movie_id: 'm1',
        movie_title: '更新は新しいが人気低め',
        url: '/movies/m1',
        favorite_count: 5,
        update: '2026-01-20T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 'm2',
        movie_title: '更新は古いが人気上位',
        url: '/movies/m2',
        favorite_count: 50,
        update: '2026-01-18T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
    ]
    const { client } = buildWeekdayItemsSupabaseMock({ rows })
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayItems({ weekday: 'mon', sortOrder: 'invalid' })

    expect(result.ok).toBe(true)
    expect(result.data.items.map((item) => item.id)).toEqual(['m2', 'm1'])
  })

  it('過去1週間の条件と人気順の条件で取得し、曜日ごとに返す', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const rows = [
      {
        movie_id: 'm1',
        movie_title: '月曜のレター',
        url: '/movies/m1',
        favorite_count: 120,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 't1',
        movie_title: '火のしおり',
        url: '/movies/t1',
        favorite_count: 90,
        update: '2026-01-18T10:00:00Z',
        series_id: null,
        weekday: 'tue',
      },
    ]

    const { client, calls } = buildSupabaseMock(rows)
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayLists()

    expect(calls.fromMock).toHaveBeenCalledWith('movie')
    expect(calls.selectMock).toHaveBeenCalled()
    expect(calls.selectMock.mock.calls[0][0]).toContain('favorite_count')
    expect(calls.selectMock.mock.calls[0][0]).toContain('update')
    expect(calls.gteMock).toHaveBeenCalledWith('update', '2026-01-13T12:00:00.000Z')
    expect(calls.orderMock).toHaveBeenCalledWith('favorite_count', { ascending: false })

    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(WEEKDAY_KEYS.length)
    const monday = result.data.find((list) => list.weekday === 'mon')
    expect(monday.items[0]).toMatchObject({
      title: '月曜のレター',
      popularityScore: 120,
      weekday: 'mon',
    })

    vi.useRealTimers()
  })

  it('曜日キーに該当しないデータは一覧に含めない', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const rows = [
      {
        movie_id: 'm1',
        movie_title: '月曜のレター',
        url: '/movies/m1',
        favorite_count: 120,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 'x1',
        movie_title: '未知の曜日',
        url: '/movies/x1',
        favorite_count: 999,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'xxx',
      },
    ]

    const { client } = buildSupabaseMock(rows)
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayLists()

    expect(result.ok).toBe(true)
    const monday = result.data.find((list) => list.weekday === 'mon')
    expect(monday.items).toHaveLength(1)
    expect(monday.items[0].title).toBe('月曜のレター')

    vi.useRealTimers()
  })

  it('過去1週間より前のデータは一覧に含めない', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-20T12:00:00Z'))

    const rows = [
      {
        movie_id: 'm1',
        movie_title: '月曜のレター',
        url: '/movies/m1',
        favorite_count: 120,
        update: '2026-01-19T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
      {
        movie_id: 'o1',
        movie_title: '古い作品',
        url: '/movies/o1',
        favorite_count: 999,
        update: '2026-01-10T10:00:00Z',
        series_id: null,
        weekday: 'mon',
      },
    ]

    const { client } = buildSupabaseMock(rows)
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayLists()

    expect(result.ok).toBe(true)
    const monday = result.data.find((list) => list.weekday === 'mon')
    expect(monday.items).toHaveLength(1)
    expect(monday.items[0].title).toBe('月曜のレター')

    vi.useRealTimers()
  })

  it('Supabase未設定の場合はnot_configuredとして返す', async () => {
    const provider = createWeekdayDataProvider(null)

    const result = await provider.fetchWeekdayLists()

    expect(result).toEqual({ ok: false, error: 'not_configured' })
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client } = buildSupabaseErrorMock(new Error('Failed to fetch'))
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayLists()

    expect(result).toEqual({ ok: false, error: 'network' })
  })

  it('不明な失敗時はunknownとして返す', async () => {
    const { client } = buildSupabaseErrorMock(new Error('boom'))
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayLists()

    expect(result).toEqual({ ok: false, error: 'unknown' })
  })

  it('空データの場合は空の曜日一覧を返す', async () => {
    const { client } = buildSupabaseMock([])
    const provider = createWeekdayDataProvider(client)

    const result = await provider.fetchWeekdayLists()

    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(WEEKDAY_KEYS.length)
    expect(result.data.every((list) => list.items.length === 0)).toBe(true)
  })
})
