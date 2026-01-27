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

  const movieOrderMock = vi.fn().mockResolvedValue({ data: movieRows, error: movieError })
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
      listMovieSelectMock,
      listMovieEqMock,
      listMovieInMock,
    },
  }
}

const buildSeriesSupabaseMock = (rows, error = null) => {
  const eqMock = vi.fn().mockResolvedValue({ data: rows, error })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock },
  }
}

const buildToggleSupabaseMock = ({
  table,
  existing,
  selectError = null,
  mutateError = null,
  userSeriesError = null,
  sessionUserId = 'viewer-1',
  sessionError = null,
} = {}) => {
  const deleteEqMock = vi.fn().mockResolvedValue({ data: null, error: mutateError })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock })
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: mutateError })
  const limitMock = vi.fn().mockResolvedValue({
    data: existing ? [{ id: 'row' }] : [],
    error: selectError,
  })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const userSeriesInsertMock = vi
    .fn()
    .mockResolvedValue({ data: null, error: userSeriesError })
  const userSeriesDeleteEqMock = vi.fn()
  userSeriesDeleteEqMock
    .mockReturnValueOnce({ eq: userSeriesDeleteEqMock })
    .mockResolvedValueOnce({ data: null, error: userSeriesError })
  const userSeriesDeleteMock = vi.fn().mockReturnValue({ eq: userSeriesDeleteEqMock })

  const fromMock = vi.fn().mockImplementation((name) => {
    if (name === table) {
      return { select: selectMock, delete: deleteMock, insert: insertMock }
    }
    if (name === 'user_series') {
      return { insert: userSeriesInsertMock, delete: userSeriesDeleteMock }
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
      eqMock,
      limitMock,
      deleteMock,
      deleteEqMock,
      insertMock,
      userSeriesInsertMock,
      userSeriesDeleteMock,
      userSeriesDeleteEqMock,
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
    const { client, calls } = buildSeriesSupabaseMock(rows)
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchSeriesOverview('series-1')

    expect(calls.fromMock).toHaveBeenCalledWith('series')
    expect(calls.selectMock).toHaveBeenCalled()
    expect(calls.eqMock).toHaveBeenCalledWith('series_id', 'series-1')
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

  it('作品が見つからない場合はnot_foundとして返す', async () => {
    const { client } = buildSeriesSupabaseMock([])
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchSeriesOverview('series-404')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('話数一覧を公開日順に並び替え、未設定は末尾に配置する', async () => {
    const rows = [
      {
        movie_id: 'movie-null',
        movie_title: '未設定',
        url: null,
        thumbnail_url: null,
        update: null,
      },
      {
        movie_id: 'movie-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
      {
        movie_id: 'movie-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'latest')

    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'movie-latest',
      'movie-old',
      'movie-null',
    ])
  })

  it('古い順を指定した場合は古い順で並び替える', async () => {
    const rows = [
      {
        movie_id: 'movie-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
      {
        movie_id: 'movie-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client, calls } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'oldest')

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.listOrderMock).toHaveBeenCalledWith('list_id', { ascending: true })
    expect(calls.listLimitMock).toHaveBeenCalledWith(1)
    expect(calls.fromMock).toHaveBeenCalledWith('movie')
    expect(calls.movieSelectMock).toHaveBeenCalledWith(
      'movie_id, movie_title, url, thumbnail_url, update'
    )
    expect(calls.movieEqMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(calls.movieOrderMock).toHaveBeenCalledWith('update', { ascending: true })
    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'movie-old',
      'movie-latest',
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
    expect(result.data.map((episode) => episode.isOshi)).toEqual([true, false])
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

  it('古い順でも公開日未設定は末尾に配置する', async () => {
    const rows = [
      {
        movie_id: 'movie-null',
        movie_title: '未設定',
        url: null,
        thumbnail_url: null,
        update: null,
      },
      {
        movie_id: 'movie-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
      {
        movie_id: 'movie-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client } = buildEpisodesSupabaseMock({ movieRows: rows })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchMovies('series-1', 'oldest')

    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'movie-old',
      'movie-latest',
      'movie-null',
    ])
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
    const { client: seriesClient } = buildSeriesSupabaseMock(null, new Error('Failed to fetch'))
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
    const { client: seriesClient } = buildSeriesSupabaseMock(null, new Error('boom'))
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
      table: 'series_favorite',
      existing: false,
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.toggleSeriesFavorite('series-1')

    expect(calls.fromMock).toHaveBeenCalledWith('series_favorite')
    expect(calls.selectMock).toHaveBeenCalled()
    expect(calls.eqMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(calls.insertMock).toHaveBeenCalledWith({ series_id: 'series-1' })
    expect(calls.userSeriesInsertMock).toHaveBeenCalledWith({
      user_id: 'viewer-1',
      series_id: 'series-1',
    })
    expect(result).toEqual({ ok: true, data: { isFavorited: true } })
  })

  it('お気に入りが登録済みの場合は解除して状態を返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      table: 'series_favorite',
      existing: true,
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.toggleSeriesFavorite('series-1')

    expect(calls.deleteMock).toHaveBeenCalled()
    expect(calls.deleteEqMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(calls.userSeriesDeleteMock).toHaveBeenCalled()
    expect(calls.userSeriesDeleteEqMock).toHaveBeenCalledWith('user_id', 'viewer-1')
    expect(calls.userSeriesDeleteEqMock).toHaveBeenCalledWith('series_id', 'series-1')
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
      table: 'series_favorite',
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
