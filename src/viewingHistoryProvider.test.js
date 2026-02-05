import { describe, expect, it, vi } from 'vitest'
import { createViewingHistoryProvider } from './viewingHistoryProvider.js'

const buildHistorySupabaseMock = ({
  historyRows = [],
  historyError = null,
  movieRows = [],
  movieError = null,
  listRows = [{ list_id: 1 }],
  listError = null,
  listMovieRows = [],
  listMovieError = null,
  sessionUserId = 'user-1',
  sessionError = null,
} = {}) => {
  const getSessionMock = vi.fn().mockResolvedValue({
    data: sessionUserId ? { session: { user: { id: sessionUserId } } } : { session: null },
    error: sessionError,
  })

  const historyLimitMock = vi
    .fn()
    .mockResolvedValue({ data: historyRows, error: historyError })
  const historyOrderMock = vi.fn().mockReturnValue({ limit: historyLimitMock })
  const historyEqMock = vi.fn().mockReturnValue({ order: historyOrderMock })
  const historySelectMock = vi.fn().mockReturnValue({ eq: historyEqMock })

  const movieInMock = vi.fn().mockResolvedValue({ data: movieRows, error: movieError })
  const movieSelectMock = vi.fn().mockReturnValue({ in: movieInMock })

  const listLimitMock = vi.fn().mockResolvedValue({ data: listRows, error: listError })
  const listOrderMock = vi.fn().mockReturnValue({ limit: listLimitMock })
  const listEqMock = vi.fn().mockReturnValue({ order: listOrderMock })
  const listSelectMock = vi.fn().mockReturnValue({ eq: listEqMock })

  const listMovieInMock = vi
    .fn()
    .mockResolvedValue({ data: listMovieRows, error: listMovieError })
  const listMovieEqMock = vi.fn().mockReturnValue({ in: listMovieInMock })
  const listMovieSelectMock = vi.fn().mockReturnValue({ eq: listMovieEqMock })

  const fromMock = vi.fn((table) => {
    if (table === 'history') return { select: historySelectMock }
    if (table === 'movie') return { select: movieSelectMock }
    if (table === 'list') return { select: listSelectMock }
    if (table === 'list_movie') return { select: listMovieSelectMock }
    return {}
  })

  return {
    client: { from: fromMock, auth: { getSession: getSessionMock } },
    calls: {
      fromMock,
      historySelectMock,
      historyEqMock,
      historyOrderMock,
      historyLimitMock,
      movieSelectMock,
      movieInMock,
      listSelectMock,
      listEqMock,
      listOrderMock,
      listLimitMock,
      listMovieSelectMock,
      listMovieEqMock,
      listMovieInMock,
      getSessionMock,
    },
  }
}

describe('ViewingHistoryProvider', () => {
  it('クリック日時降順で30件以内に整形し、推し判定付きで返す', async () => {
    const historyRows = [
      { history_id: 10, movie_id: 'movie-2', clicked_at: '2026-02-03T10:00:00Z' },
      { history_id: 9, movie_id: 'movie-1', clicked_at: '2026-02-02T10:00:00Z' },
      { history_id: 8, movie_id: 'missing', clicked_at: '2026-02-01T10:00:00Z' },
    ]
    const movieRows = [
      {
        movie_id: 'movie-1',
        series_id: 'series-1',
        movie_title: '動画1',
        thumbnail_url: '/thumb/1.png',
        favorite_count: 3,
      },
      {
        movie_id: 'movie-2',
        series_id: 'series-2',
        movie_title: '動画2',
        thumbnail_url: null,
        favorite_count: 0,
      },
    ]
    const listRows = [{ list_id: 99 }]
    const listMovieRows = [{ list_id: 99, movie_id: 'movie-2' }]
    const { client, calls } = buildHistorySupabaseMock({
      historyRows,
      movieRows,
      listRows,
      listMovieRows,
    })
    const provider = createViewingHistoryProvider(client)

    const result = await provider.fetchHistory()

    expect(calls.fromMock).toHaveBeenCalledWith('history')
    expect(calls.historySelectMock).toHaveBeenCalledWith('history_id, movie_id, clicked_at')
    expect(calls.historyEqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.historyOrderMock).toHaveBeenCalledWith('clicked_at', { ascending: false })
    expect(calls.historyLimitMock).toHaveBeenCalledWith(30)

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.listEqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.listOrderMock).toHaveBeenCalledWith('list_id', { ascending: true })
    expect(calls.listLimitMock).toHaveBeenCalledWith(1)

    expect(calls.fromMock).toHaveBeenCalledWith('movie')
    expect(calls.movieSelectMock).toHaveBeenCalledWith(
      'movie_id, series_id, movie_title, thumbnail_url, favorite_count'
    )
    expect(calls.movieInMock).toHaveBeenCalledWith('movie_id', [
      'movie-2',
      'movie-1',
      'missing',
    ])

    expect(calls.fromMock).toHaveBeenCalledWith('list_movie')
    expect(calls.listMovieSelectMock).toHaveBeenCalledWith('list_id, movie_id')
    expect(calls.listMovieEqMock).toHaveBeenCalledWith('list_id', 99)
    expect(calls.listMovieInMock).toHaveBeenCalledWith('movie_id', [
      'movie-2',
      'movie-1',
      'missing',
    ])

    expect(result).toEqual({
      ok: true,
      data: [
        {
          historyId: 10,
          movieId: 'movie-2',
          seriesId: 'series-2',
          title: '動画2',
          thumbnailUrl: null,
          clickedAt: '2026-02-03T10:00:00Z',
          favoriteCount: 0,
          isOshi: true,
        },
        {
          historyId: 9,
          movieId: 'movie-1',
          seriesId: 'series-1',
          title: '動画1',
          thumbnailUrl: '/thumb/1.png',
          clickedAt: '2026-02-02T10:00:00Z',
          favoriteCount: 3,
          isOshi: false,
        },
      ],
    })
  })

  it('movie情報が欠損する履歴は除外する', async () => {
    const historyRows = [
      { history_id: 1, movie_id: 'missing-1', clicked_at: '2026-02-03T10:00:00Z' },
    ]
    const { client } = buildHistorySupabaseMock({ historyRows, movieRows: [] })
    const provider = createViewingHistoryProvider(client)

    const result = await provider.fetchHistory()

    expect(result).toEqual({ ok: true, data: [] })
  })

  it('履歴が30件を超える場合は30件に制限して返す', async () => {
    const historyRows = Array.from({ length: 31 }, (_, index) => ({
      history_id: 200 - index,
      movie_id: `movie-${index + 1}`,
      clicked_at: `2026-02-${String(31 - index).padStart(2, '0')}T10:00:00Z`,
    }))
    const movieRows = [...historyRows]
      .map((row) => ({
        movie_id: row.movie_id,
        series_id: `series-${row.movie_id}`,
        movie_title: `動画${row.movie_id}`,
        thumbnail_url: null,
        favorite_count: 0,
      }))
      .reverse()
    const { client } = buildHistorySupabaseMock({ historyRows, movieRows })
    const provider = createViewingHistoryProvider(client)

    const result = await provider.fetchHistory()

    expect(result.ok).toBe(true)
    expect(result.data).toHaveLength(30)
    expect(result.data[0].historyId).toBe(historyRows[0].history_id)
    expect(result.data[29].historyId).toBe(historyRows[29].history_id)
  })

  it('Supabase未設定時はnot_configuredを返す', async () => {
    const provider = createViewingHistoryProvider(null)

    const result = await provider.fetchHistory()

    expect(result).toEqual({ ok: false, error: 'not_configured' })
  })

  it('未ログイン時はauth_requiredを返す', async () => {
    const { client } = buildHistorySupabaseMock({ sessionUserId: null })
    const provider = createViewingHistoryProvider(client)

    const result = await provider.fetchHistory()

    expect(result).toEqual({ ok: false, error: 'auth_required' })
  })

  it('通信エラー時はnetworkを返す', async () => {
    const historyError = { message: 'Failed to fetch' }
    const { client } = buildHistorySupabaseMock({ historyError })
    const provider = createViewingHistoryProvider(client)

    const result = await provider.fetchHistory()

    expect(result).toEqual({ ok: false, error: 'network' })
  })

  it('認証エラー時はauth_requiredを返す', async () => {
    const listError = { code: 'PGRST301' }
    const { client } = buildHistorySupabaseMock({
      historyRows: [{ history_id: 1, movie_id: 'movie-1', clicked_at: '2026-02-03T10:00:00Z' }],
      movieRows: [
        {
          movie_id: 'movie-1',
          series_id: 'series-1',
          movie_title: '動画1',
          thumbnail_url: null,
          favorite_count: 0,
        },
      ],
      listError,
    })
    const provider = createViewingHistoryProvider(client)

    const result = await provider.fetchHistory()

    expect(result).toEqual({ ok: false, error: 'auth_required' })
  })

  it('limit指定を1-30に正規化する', async () => {
    const { client, calls } = buildHistorySupabaseMock()
    const provider = createViewingHistoryProvider(client)

    await provider.fetchHistory({ limit: 50 })
    await provider.fetchHistory({ limit: 0 })

    expect(calls.historyLimitMock).toHaveBeenCalledWith(30)
    expect(calls.historyLimitMock).toHaveBeenCalledWith(1)
  })
})
