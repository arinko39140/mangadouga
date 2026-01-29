import { describe, expect, it, vi } from 'vitest'
import { createWorkPageDataProvider } from './workPageDataProvider.js'

const buildEpisodesSupabaseMock = ({
  movieRows = [],
  movieError = null,
  listRows = [{ list_id: 1 }],
  listError = null,
  listMovieRows = [],
  listMovieError = null,
} = {}) => {
  const listLimitMock = vi
    .fn()
    .mockResolvedValue({ data: listRows, error: listError })
  const listOrderMock = vi.fn().mockReturnValue({ limit: listLimitMock })
  const listSelectMock = vi.fn().mockReturnValue({ order: listOrderMock })

  const movieRangeMock = vi
    .fn()
    .mockResolvedValue({ data: movieRows, error: movieError })
  const movieOrderMock = vi
    .fn()
    .mockImplementation(() => ({ order: movieOrderMock, range: movieRangeMock }))
  const movieEqMock = vi.fn().mockReturnValue({ order: movieOrderMock })
  const movieSelectMock = vi.fn().mockReturnValue({ eq: movieEqMock })

  const listMovieInMock = vi
    .fn()
    .mockResolvedValue({ data: listMovieRows, error: listMovieError })
  const listMovieEqMock = vi.fn().mockReturnValue({ in: listMovieInMock })
  const listMovieSelectMock = vi.fn().mockReturnValue({ eq: listMovieEqMock })

  const fromMock = vi.fn((table) => {
    if (table === 'list') return { select: listSelectMock }
    if (table === 'movie') return { select: movieSelectMock }
    if (table === 'list_movie') return { select: listMovieSelectMock }
    return {}
  })

  return {
    client: { from: fromMock },
    calls: {
      fromMock,
      listSelectMock,
      listOrderMock,
      listLimitMock,
      movieSelectMock,
      movieEqMock,
      movieOrderMock,
      movieRangeMock,
      listMovieSelectMock,
      listMovieEqMock,
      listMovieInMock,
    },
  }
}

const buildSeriesSupabaseMock = ({
  seriesRows = [],
  seriesError = null,
  userSeriesRows = [],
  userSeriesError = null,
  sessionUserId = null,
  sessionError = null,
} = {}) => {
  const seriesEqMock = vi.fn().mockResolvedValue({ data: seriesRows, error: seriesError })
  const seriesSelectMock = vi.fn().mockReturnValue({ eq: seriesEqMock })

  const userSeriesLimitMock = vi.fn().mockResolvedValue({
    data: userSeriesRows,
    error: userSeriesError,
  })
  const userSeriesEqSeriesMock = vi.fn().mockReturnValue({ limit: userSeriesLimitMock })
  const userSeriesEqUserMock = vi.fn().mockReturnValue({ eq: userSeriesEqSeriesMock })
  const userSeriesSelectMock = vi.fn().mockReturnValue({ eq: userSeriesEqUserMock })

  const fromMock = vi.fn((table) => {
    if (table === 'series') return { select: seriesSelectMock }
    if (table === 'user_series') return { select: userSeriesSelectMock }
    return {}
  })

  const client = { from: fromMock }

  if (sessionUserId !== null || sessionError !== null) {
    client.auth = {
      getSession: vi.fn().mockResolvedValue({
        data: sessionUserId ? { session: { user: { id: sessionUserId } } } : { session: null },
        error: sessionError,
      }),
    }
  }

  return {
    client,
    calls: {
      fromMock,
      seriesSelectMock,
      seriesEqMock,
      userSeriesSelectMock,
      userSeriesEqUserMock,
      userSeriesEqSeriesMock,
      userSeriesLimitMock,
      getSessionMock: client.auth?.getSession,
    },
  }
}

const buildToggleSupabaseMock = ({
  existing,
  selectError = null,
  mutateError = null,
  sessionUserId = 'viewer-1',
  sessionError = null,
} = {}) => {
  const deleteEqSeriesMock = vi.fn().mockResolvedValue({ data: null, error: mutateError })
  const deleteEqUserMock = vi.fn().mockReturnValue({ eq: deleteEqSeriesMock })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqUserMock })
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: mutateError })
  const limitMock = vi.fn().mockResolvedValue({
    data: existing ? [{ series_id: 'series-1' }] : [],
    error: selectError,
  })
  const eqSeriesMock = vi.fn().mockReturnValue({ limit: limitMock })
  const eqUserMock = vi.fn().mockReturnValue({ eq: eqSeriesMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqUserMock })

  const fromMock = vi.fn().mockImplementation((name) => {
    if (name === 'user_series') {
      return { select: selectMock, delete: deleteMock, insert: insertMock }
    }
    return {}
  })

  const getSessionMock = vi.fn().mockResolvedValue({
    data: sessionUserId ? { session: { user: { id: sessionUserId } } } : { session: null },
    error: sessionError,
  })

  return {
    client: { from: fromMock, auth: { getSession: getSessionMock } },
    calls: {
      fromMock,
      selectMock,
      eqUserMock,
      eqSeriesMock,
      limitMock,
      deleteMock,
      deleteEqUserMock,
      deleteEqSeriesMock,
      insertMock,
      getSessionMock,
    },
  }
}

const buildToggleMovieSupabaseMock = ({
  listId = 1,
  existing,
  listError = null,
  selectError = null,
  mutateError = null,
} = {}) => {
  const listLimitMock = vi
    .fn()
    .mockResolvedValue({ data: listId ? [{ list_id: listId }] : [], error: listError })
  const listOrderMock = vi.fn().mockReturnValue({ limit: listLimitMock })
  const listSelectMock = vi.fn().mockReturnValue({ order: listOrderMock })

  const listMovieLimitMock = vi.fn().mockResolvedValue({
    data: existing ? [{ list_id: listId, movie_id: 'movie-1' }] : [],
    error: selectError,
  })
  const listMovieEqMovieMock = vi.fn().mockReturnValue({ limit: listMovieLimitMock })
  const listMovieEqListMock = vi.fn().mockReturnValue({ eq: listMovieEqMovieMock })
  const listMovieSelectMock = vi.fn().mockReturnValue({ eq: listMovieEqListMock })

  const listMovieDeleteEqMovieMock = vi
    .fn()
    .mockResolvedValue({ data: null, error: mutateError })
  const listMovieDeleteEqListMock = vi.fn().mockReturnValue({ eq: listMovieDeleteEqMovieMock })
  const listMovieDeleteMock = vi.fn().mockReturnValue({ eq: listMovieDeleteEqListMock })
  const listMovieInsertMock = vi
    .fn()
    .mockResolvedValue({ data: null, error: mutateError })

  const fromMock = vi.fn((name) => {
    if (name === 'list') return { select: listSelectMock }
    if (name !== 'list_movie') return {}
    return { select: listMovieSelectMock, delete: listMovieDeleteMock, insert: listMovieInsertMock }
  })

  return {
    client: { from: fromMock },
    calls: {
      fromMock,
      listSelectMock,
      listOrderMock,
      listLimitMock,
      listMovieSelectMock,
      listMovieEqListMock,
      listMovieEqMovieMock,
      listMovieLimitMock,
      listMovieDeleteMock,
      listMovieDeleteEqListMock,
      listMovieDeleteEqMovieMock,
      listMovieInsertMock,
    },
  }
}

describe('WorkPageDataProvider', () => {
  it('作品情報を取得して画面向けに変換する', async () => {
    const rows = [
      { series_id: 'series-1', title: 'テスト作品', favorite_count: 12 },
    ]
    const { client, calls } = buildSeriesSupabaseMock({ seriesRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchSeriesOverview('series-1')

    expect(calls.fromMock).toHaveBeenCalledWith('series')
    expect(calls.seriesSelectMock).toHaveBeenCalled()
    expect(calls.seriesEqMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'series-1',
        title: 'テスト作品',
        favoriteCount: 12,
        isFavorited: false,
      },
    })
  })

  it('ログイン中に推し登録済みならisFavoritedがtrueになる', async () => {
    const rows = [
      { series_id: 'series-1', title: 'テスト作品', favorite_count: 1 },
    ]
    const { client, calls } = buildSeriesSupabaseMock({
      seriesRows: rows,
      userSeriesRows: [{ series_id: 'series-1' }],
      sessionUserId: 'viewer-1',
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchSeriesOverview('series-1')

    expect(calls.fromMock).toHaveBeenCalledWith('series')
    expect(calls.fromMock).toHaveBeenCalledWith('user_series')
    expect(calls.userSeriesSelectMock).toHaveBeenCalledWith('series_id')
    expect(calls.userSeriesEqUserMock).toHaveBeenCalledWith('user_id', 'viewer-1')
    expect(calls.userSeriesEqSeriesMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(result).toEqual({
      ok: true,
      data: {
        id: 'series-1',
        title: 'テスト作品',
        favoriteCount: 1,
        isFavorited: true,
      },
    })
  })

  it('作品が見つからない場合はnot_foundとして返す', async () => {
    const { client } = buildSeriesSupabaseMock({ seriesRows: [] })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchSeriesOverview('series-404')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('話数一覧は投稿日降順で取得し、取得順のまま返す', async () => {
    const rows = [
      {
        movie_id: 'movie-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
      {
        movie_id: 'movie-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
    ]
    const { client, calls } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'latest')

    expect(result.ok).toBe(true)
    expect(calls.movieOrderMock).toHaveBeenCalledWith('update', { ascending: false })
    expect(calls.movieRangeMock).toHaveBeenCalledWith(0, 49)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'movie-latest',
      'movie-old',
    ])
  })

  it('人気順はfavorite_count降順→update降順で取得する', async () => {
    const rows = [
      {
        movie_id: 'movie-popular',
        movie_title: '人気話',
        url: '/watch/popular',
        thumbnail_url: null,
        update: '2026-01-02T00:00:00Z',
      },
      {
        movie_id: 'movie-less',
        movie_title: '控えめ',
        url: '/watch/less',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client, calls } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'popular')

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.listOrderMock).toHaveBeenCalledWith('list_id', { ascending: true })
    expect(calls.listLimitMock).toHaveBeenCalledWith(1)
    expect(calls.fromMock).toHaveBeenCalledWith('movie')
    expect(calls.movieSelectMock).toHaveBeenCalledWith(
      'movie_id, movie_title, url, thumbnail_url, update, favorite_count'
    )
    expect(calls.movieEqMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(calls.movieOrderMock).toHaveBeenCalledWith('favorite_count', { ascending: false })
    expect(calls.movieOrderMock).toHaveBeenCalledWith('update', { ascending: false })
    expect(calls.movieRangeMock).toHaveBeenCalledWith(0, 49)
    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'movie-popular',
      'movie-less',
    ])
  })

  it('推し登録済みの動画はisOshiがtrueになる', async () => {
    const rows = [
      {
        movie_id: 'movie-1',
        movie_title: '第1話',
        url: '/watch/1',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
      {
        movie_id: 'movie-2',
        movie_title: '第2話',
        url: '/watch/2',
        thumbnail_url: null,
        update: '2026-01-02T00:00:00Z',
      },
    ]
    const { client } = buildEpisodesSupabaseMock({
      movieRows: rows,
      listMovieRows: [{ movie_id: 'movie-2' }],
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'latest')

    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.isOshi)).toEqual([false, true])
  })

  it('推し未登録の動画はisOshiがfalseになる', async () => {
    const rows = [
      {
        movie_id: 'movie-1',
        movie_title: '第1話',
        url: '/watch/1',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
      {
        movie_id: 'movie-2',
        movie_title: '第2話',
        url: '/watch/2',
        thumbnail_url: null,
        update: '2026-01-02T00:00:00Z',
      },
    ]
    const { client } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'latest')

    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.isOshi)).toEqual([false, false])
  })

  it('未対応のsortOrderは人気順として扱う', async () => {
    const rows = [
      {
        movie_id: 'movie-popular',
        movie_title: '人気話',
        url: '/watch/popular',
        thumbnail_url: null,
        update: '2026-01-02T00:00:00Z',
      },
    ]
    const { client, calls } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'invalid')

    expect(calls.movieOrderMock).toHaveBeenCalledWith('favorite_count', { ascending: false })
    expect(calls.movieOrderMock).toHaveBeenCalledWith('update', { ascending: false })
    expect(calls.movieRangeMock).toHaveBeenCalledWith(0, 49)
    expect(result.ok).toBe(true)
  })

  it('Supabase未設定の場合はnot_configuredとして返す', async () => {
    const provider = createWorkPageDataProvider(null)

    await expect(provider.fetchSeriesOverview('series-1')).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
    await expect(provider.fetchMovies('series-1', 'latest')).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client: seriesClient } = buildSeriesSupabaseMock({
      seriesRows: null,
      seriesError: new Error('Failed to fetch'),
    })
    const { client: episodesClient } = buildEpisodesSupabaseMock({
      movieError: new Error('NetworkError'),
    })

    const seriesProvider = createWorkPageDataProvider(seriesClient)
    const episodesProvider = createWorkPageDataProvider(episodesClient)

    await expect(seriesProvider.fetchSeriesOverview('series-1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
    await expect(episodesProvider.fetchMovies('series-1', 'latest')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })

  it('不明な失敗時はunknownとして返す', async () => {
    const { client: seriesClient } = buildSeriesSupabaseMock({
      seriesRows: null,
      seriesError: new Error('boom'),
    })
    const { client: episodesClient } = buildEpisodesSupabaseMock({
      movieError: new Error('boom'),
    })

    const seriesProvider = createWorkPageDataProvider(seriesClient)
    const episodesProvider = createWorkPageDataProvider(episodesClient)

    await expect(seriesProvider.fetchSeriesOverview('series-1')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
    await expect(episodesProvider.fetchMovies('series-1', 'latest')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
  })

  it('お気に入りが未登録の場合は登録して状態を返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      existing: false,
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.toggleSeriesFavorite('series-1')

    expect(calls.fromMock).toHaveBeenCalledWith('user_series')
    expect(calls.selectMock).toHaveBeenCalledWith('series_id')
    expect(calls.eqUserMock).toHaveBeenCalledWith('user_id', 'viewer-1')
    expect(calls.eqSeriesMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(calls.insertMock).toHaveBeenCalledWith({
      user_id: 'viewer-1',
      series_id: 'series-1',
    })
    expect(result).toEqual({ ok: true, data: { isFavorited: true } })
  })

  it('お気に入りが登録済みの場合は解除して状態を返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      existing: true,
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.toggleSeriesFavorite('series-1')

    expect(calls.deleteMock).toHaveBeenCalled()
    expect(calls.deleteEqUserMock).toHaveBeenCalledWith('user_id', 'viewer-1')
    expect(calls.deleteEqSeriesMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(result).toEqual({ ok: true, data: { isFavorited: false } })
  })

  it('推しが未登録の場合は登録して状態を返す', async () => {
    const { client, calls } = buildToggleMovieSupabaseMock({
      existing: false,
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.toggleMovieOshi('movie-1')

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.fromMock).toHaveBeenCalledWith('list_movie')
    expect(calls.listMovieEqListMock).toHaveBeenCalledWith('list_id', 1)
    expect(calls.listMovieEqMovieMock).toHaveBeenCalledWith('movie_id', 'movie-1')
    expect(calls.listMovieInsertMock).toHaveBeenCalledWith({
      list_id: 1,
      movie_id: 'movie-1',
    })
    expect(result).toEqual({ ok: true, data: { isOshi: true } })
  })

  it('推し登録時にmovieIdが無効ならinvalid_inputを返す', async () => {
    const provider = createWorkPageDataProvider({ from: vi.fn() })

    await expect(provider.toggleMovieOshi('')).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
  })

  it('推し登録時に重複が発生した場合はconflictを返す', async () => {
    const { client } = buildToggleMovieSupabaseMock({
      existing: false,
      mutateError: { code: '23505', message: 'duplicate key' },
    })
    const provider = createWorkPageDataProvider(client)

    await expect(provider.toggleMovieOshi('movie-1')).resolves.toEqual({
      ok: false,
      error: 'conflict',
    })
  })

  it('更新失敗時はエラーを正規化して返す', async () => {
    const { client: favoriteClient } = buildToggleSupabaseMock({
      existing: false,
      mutateError: new Error('NetworkError'),
    })
    const { client: oshiClient } = buildToggleMovieSupabaseMock({
      existing: false,
      selectError: new Error('boom'),
    })
    const favoriteProvider = createWorkPageDataProvider(favoriteClient)
    const oshiProvider = createWorkPageDataProvider(oshiClient)

    await expect(favoriteProvider.toggleSeriesFavorite('series-1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
    await expect(oshiProvider.toggleMovieOshi('movie-1')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
  })
})
