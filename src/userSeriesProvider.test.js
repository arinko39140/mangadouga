import { describe, expect, it, vi } from 'vitest'
import { createUserSeriesProvider } from './userSeriesProvider.js'

const buildSeriesSupabaseMock = ({ rows = [], error = null } = {}) => {
  const eqMock = vi.fn()
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  eqMock
    .mockReturnValueOnce({ eq: eqMock })
    .mockResolvedValueOnce({ data: rows, error })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock },
  }
}

const buildSeriesSummaryMock = ({
  seriesRows = [],
  seriesError = null,
  movieRows = [],
  movieError = null,
} = {}) => {
  const limitMock = vi.fn().mockResolvedValue({ data: seriesRows, error: seriesError })
  const orderMock = vi.fn().mockReturnValue({ limit: limitMock })
  const eqMock = vi.fn()
  eqMock.mockReturnValue({ eq: eqMock, order: orderMock, limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock, order: orderMock, limit: limitMock })

  const movieOrderMock = vi.fn().mockResolvedValue({ data: movieRows, error: movieError })
  const movieInMock = vi.fn().mockReturnValue({ order: movieOrderMock })
  const movieSelectMock = vi.fn().mockReturnValue({ in: movieInMock })

  const fromMock = vi.fn((table) => {
    if (table === 'user_series') {
      return { select: selectMock }
    }
    if (table === 'movie') {
      return { select: movieSelectMock }
    }
    return { select: vi.fn() }
  })

  return {
    client: { from: fromMock },
    calls: {
      fromMock,
      selectMock,
      eqMock,
      orderMock,
      limitMock,
      movieSelectMock,
      movieInMock,
      movieOrderMock,
    },
  }
}

const buildSeriesListMock = ({
  seriesRows = [],
  seriesError = null,
  movieRows = [],
  movieError = null,
} = {}) => {
  const orderMock = vi.fn().mockResolvedValue({ data: seriesRows, error: seriesError })
  const eqMock = vi.fn()
  eqMock.mockReturnValue({ eq: eqMock, order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock, order: orderMock })

  const movieOrderMock = vi.fn().mockResolvedValue({ data: movieRows, error: movieError })
  const movieInMock = vi.fn().mockReturnValue({ order: movieOrderMock })
  const movieSelectMock = vi.fn().mockReturnValue({ in: movieInMock })

  const fromMock = vi.fn((table) => {
    if (table === 'user_series') {
      return { select: selectMock }
    }
    if (table === 'movie') {
      return { select: movieSelectMock }
    }
    return { select: vi.fn() }
  })

  return {
    client: { from: fromMock },
    calls: {
      fromMock,
      selectMock,
      eqMock,
      orderMock,
      movieSelectMock,
      movieInMock,
      movieOrderMock,
    },
  }
}

const buildRegisterSeriesMock = ({ insertError = null, deleteError = null } = {}) => {
  const insertMock = vi.fn().mockResolvedValue({ error: insertError })
  const deleteMock = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: deleteError }) }) })
  const fromMock = vi.fn().mockReturnValue({
    insert: insertMock,
    delete: deleteMock,
  })

  return {
    client: {
      from: fromMock,
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-1' } } },
          error: null,
        }),
      },
    },
    calls: { fromMock, insertMock, deleteMock },
  }
}

const buildAuthFailedMock = () => ({
  client: {
    from: vi.fn().mockReturnValue({}),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
})

describe('UserSeriesProvider', () => {
  it('公開可能なシリーズのみを取得し欠損データを除外する', async () => {
    const { client, calls } = buildSeriesSupabaseMock({
      rows: [
        {
          series: {
            series_id: 'series-1',
            title: 'テスト作品',
            favorite_count: 12,
            update: '2026-01-20T10:00:00Z',
          },
        },
        {
          series: {
            series_id: null,
            title: '欠損',
            favorite_count: 1,
            update: null,
          },
        },
        {
          series: {
            series_id: 'series-2',
            title: null,
            favorite_count: 3,
            update: null,
          },
        },
        { series: null },
      ],
    })
    const provider = createUserSeriesProvider(client)

    const result = await provider.fetchSeries('user-1')

    expect(calls.fromMock).toHaveBeenCalledWith('user_series')
    expect(calls.selectMock).toHaveBeenCalledWith(
      'series:series_id (series_id, title, favorite_count, update)'
    )
    expect(calls.eqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.eqMock).toHaveBeenCalledWith('can_display', true)
    expect(result).toEqual({
      ok: true,
      data: [
        {
          seriesId: 'series-1',
          title: 'テスト作品',
          favoriteCount: 12,
          updatedAt: '2026-01-20T10:00:00Z',
        },
      ],
    })
  })

  it('お気に入り数や更新日時が未設定でもnullで返す', async () => {
    const { client } = buildSeriesSupabaseMock({
      rows: [
        {
          series: {
            series_id: 'series-10',
            title: '未設定テスト',
            favorite_count: null,
            update: null,
          },
        },
      ],
    })
    const provider = createUserSeriesProvider(client)

    const result = await provider.fetchSeries('user-1')

    expect(result).toEqual({
      ok: true,
      data: [
        {
          seriesId: 'series-10',
          title: '未設定テスト',
          favoriteCount: null,
          updatedAt: null,
        },
      ],
    })
  })

  it('ユーザーIDが空の場合はinvalid_inputを返す', async () => {
    const { client, calls } = buildSeriesSupabaseMock()
    const provider = createUserSeriesProvider(client)

    await expect(provider.fetchSeries('  ')).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
    expect(calls.fromMock).not.toHaveBeenCalled()
  })

  it('Supabase未設定の場合はnot_configuredを返す', async () => {
    const provider = createUserSeriesProvider(null)

    await expect(provider.fetchSeries('user-1')).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
  })

  it('通信失敗時はnetworkを返す', async () => {
    const { client } = buildSeriesSupabaseMock({ error: new Error('Failed to fetch') })
    const provider = createUserSeriesProvider(client)

    await expect(provider.fetchSeries('user-1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })

  it('認証失敗時はauth_requiredを返す', async () => {
    const { client } = buildSeriesSupabaseMock({ error: { status: 401 } })
    const provider = createUserSeriesProvider(client)

    await expect(provider.fetchSeries('user-1')).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    })
  })

  it('空データの場合は空配列を返す', async () => {
    const { client } = buildSeriesSupabaseMock({ rows: [] })
    const provider = createUserSeriesProvider(client)

    await expect(provider.fetchSeries('user-1')).resolves.toEqual({
      ok: true,
      data: [],
    })
  })

  it('サマリー取得では新着順で最大3件に制限する', async () => {
    const { client, calls } = buildSeriesSummaryMock({
      seriesRows: [
        {
          series: {
            series_id: 'series-1',
            title: '作品1',
            favorite_count: 10,
            update: '2026-01-20T10:00:00Z',
          },
          created_at: '2026-01-20T10:00:00Z',
        },
      ],
    })
    const provider = createUserSeriesProvider(client)

    const result = await provider.fetchSeriesSummary({
      targetUserId: 'user-1',
      viewerUserId: 'user-1',
      limit: 3,
    })

    expect(calls.fromMock).toHaveBeenCalledWith('user_series')
    expect(calls.selectMock).toHaveBeenCalledWith(
      'series:series_id (series_id, title, favorite_count, update), created_at'
    )
    expect(calls.eqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(calls.limitMock).toHaveBeenCalledWith(3)
    expect(result.ok).toBe(true)
  })

  it('サマリー取得は最新サムネイルを結合する', async () => {
    const { client } = buildSeriesSummaryMock({
      seriesRows: [
        {
          series: {
            series_id: 'series-1',
            title: '作品1',
            favorite_count: 10,
            update: '2026-01-20T10:00:00Z',
          },
          created_at: '2026-01-20T10:00:00Z',
        },
      ],
      movieRows: [
        {
          series_id: 'series-1',
          thumbnail_url: 'thumb-old.png',
          update: '2026-01-10T10:00:00Z',
        },
        {
          series_id: 'series-1',
          thumbnail_url: 'thumb-new.png',
          update: '2026-01-12T10:00:00Z',
        },
      ],
    })
    const provider = createUserSeriesProvider(client)

    const result = await provider.fetchSeriesSummary({
      targetUserId: 'user-1',
      viewerUserId: 'user-1',
      limit: 3,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          {
            seriesId: 'series-1',
            title: '作品1',
            favoriteCount: 10,
            updatedAt: '2026-01-20T10:00:00Z',
            thumbnailUrl: 'thumb-new.png',
          },
        ],
      },
    })
  })

  it('一覧取得でお気に入り数順に並べ替えできる', async () => {
    const { client, calls } = buildSeriesListMock({
      seriesRows: [
        {
          series: {
            series_id: 'series-1',
            title: '作品1',
            favorite_count: 5,
            update: '2026-01-10T10:00:00Z',
          },
        },
      ],
    })
    const provider = createUserSeriesProvider(client)

    const result = await provider.fetchSeriesList({
      targetUserId: 'user-1',
      viewerUserId: 'user-1',
      sort: { key: 'favorite_count', order: 'desc' },
    })

    expect(calls.orderMock).toHaveBeenCalledWith('favorite_count', {
      ascending: false,
      referencedTable: 'series',
    })
    expect(result.ok).toBe(true)
  })

  it('登録操作はログインユーザーのuser_seriesを追加する', async () => {
    const { client, calls } = buildRegisterSeriesMock()
    const provider = createUserSeriesProvider(client)

    await expect(provider.registerSeries({ seriesId: 'series-1' })).resolves.toEqual({
      ok: true,
      data: null,
    })
    expect(calls.fromMock).toHaveBeenCalledWith('user_series')
    expect(calls.insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      series_id: 'series-1',
    })
  })

  it('解除操作はログインユーザーのuser_seriesを削除する', async () => {
    const { client } = buildRegisterSeriesMock()
    const provider = createUserSeriesProvider(client)

    await expect(provider.unregisterSeries({ seriesId: 'series-1' })).resolves.toEqual({
      ok: true,
      data: null,
    })
  })

  it('未ログイン時の登録はauth_requiredを返す', async () => {
    const { client } = buildAuthFailedMock()
    const provider = createUserSeriesProvider(client)

    await expect(provider.registerSeries({ seriesId: 'series-1' })).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    })
  })
})
