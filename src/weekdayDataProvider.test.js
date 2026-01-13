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

describe('WeekdayDataProvider', () => {
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
    expect(calls.gteMock).toHaveBeenCalledWith('update', '2026-01-14T12:00:00.000Z')
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
