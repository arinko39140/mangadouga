import { describe, expect, it, vi } from 'vitest'
import { createWorkPageDataProvider } from './workPageDataProvider.js'

const buildEpisodesSupabaseMock = (rows, error = null) => {
  const orderMock = vi.fn().mockResolvedValue({ data: rows, error })
  const eqMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock, orderMock },
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
}) => {
  const deleteEqMock = vi.fn().mockResolvedValue({ data: null, error: mutateError })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock })
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: mutateError })
  const limitMock = vi.fn().mockResolvedValue({
    data: existing ? [{ id: 'row' }] : [],
    error: selectError,
  })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockImplementation((name) => {
    if (name !== table) return {}
    return { select: selectMock, delete: deleteMock, insert: insertMock }
  })

  return {
    client: { from: fromMock },
    calls: {
      fromMock,
      selectMock,
      eqMock,
      limitMock,
      deleteMock,
      deleteEqMock,
      insertMock,
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
        movie_id: 'episode-null',
        movie_title: '未設定',
        url: null,
        thumbnail_url: null,
        update: null,
      },
      {
        movie_id: 'episode-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
      {
        movie_id: 'episode-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client } = buildEpisodesSupabaseMock(rows)
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchEpisodes('series-1', 'latest')

    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'episode-latest',
      'episode-old',
      'episode-null',
    ])
  })

  it('古い順を指定した場合は古い順で並び替える', async () => {
    const rows = [
      {
        movie_id: 'episode-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
      {
        movie_id: 'episode-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client, calls } = buildEpisodesSupabaseMock(rows)
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchEpisodes('series-1', 'oldest')

    expect(calls.fromMock).toHaveBeenCalledWith('movie')
    expect(calls.selectMock).toHaveBeenCalled()
    expect(calls.eqMock).toHaveBeenCalledWith('series_id', 'series-1')
    expect(calls.orderMock).toHaveBeenCalledWith('update', { ascending: true })
    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'episode-old',
      'episode-latest',
    ])
  })

  it('古い順でも公開日未設定は末尾に配置する', async () => {
    const rows = [
      {
        movie_id: 'episode-null',
        movie_title: '未設定',
        url: null,
        thumbnail_url: null,
        update: null,
      },
      {
        movie_id: 'episode-old',
        movie_title: '第1話',
        url: '/watch/old',
        thumbnail_url: null,
        update: '2025-12-01T00:00:00Z',
      },
      {
        movie_id: 'episode-latest',
        movie_title: '最新話',
        url: '/watch/latest',
        thumbnail_url: null,
        update: '2026-01-01T00:00:00Z',
      },
    ]
    const { client } = buildEpisodesSupabaseMock(rows)
    const provider = createWorkPageDataProvider(client)

    const result = await provider.fetchEpisodes('series-1', 'oldest')

    expect(result.ok).toBe(true)
    expect(result.data.map((episode) => episode.id)).toEqual([
      'episode-old',
      'episode-latest',
      'episode-null',
    ])
  })

  it('Supabase未設定の場合はnot_configuredとして返す', async () => {
    const provider = createWorkPageDataProvider(null)

    await expect(provider.fetchSeriesOverview('series-1')).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
    await expect(provider.fetchEpisodes('series-1', 'latest')).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client: seriesClient } = buildSeriesSupabaseMock(null, new Error('Failed to fetch'))
    const { client: episodesClient } = buildEpisodesSupabaseMock(null, new Error('NetworkError'))

    const seriesProvider = createWorkPageDataProvider(seriesClient)
    const episodesProvider = createWorkPageDataProvider(episodesClient)

    await expect(seriesProvider.fetchSeriesOverview('series-1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
    await expect(episodesProvider.fetchEpisodes('series-1', 'latest')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })

  it('不明な失敗時はunknownとして返す', async () => {
    const { client: seriesClient } = buildSeriesSupabaseMock(null, new Error('boom'))
    const { client: episodesClient } = buildEpisodesSupabaseMock(null, new Error('boom'))

    const seriesProvider = createWorkPageDataProvider(seriesClient)
    const episodesProvider = createWorkPageDataProvider(episodesClient)

    await expect(seriesProvider.fetchSeriesOverview('series-1')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
    await expect(episodesProvider.fetchEpisodes('series-1', 'latest')).resolves.toEqual({
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
    expect(result).toEqual({ ok: true, data: { isFavorited: false } })
  })

  it('推しが未登録の場合は登録して状態を返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      table: 'episode_oshi',
      existing: false,
    })
    const provider = createWorkPageDataProvider(client)

    const result = await provider.toggleEpisodeOshi('episode-1')

    expect(calls.fromMock).toHaveBeenCalledWith('episode_oshi')
    expect(calls.eqMock).toHaveBeenCalledWith('movie_id', 'episode-1')
    expect(calls.insertMock).toHaveBeenCalledWith({ movie_id: 'episode-1' })
    expect(result).toEqual({ ok: true, data: { isOshi: true } })
  })

  it('更新失敗時はエラーを正規化して返す', async () => {
    const { client: favoriteClient } = buildToggleSupabaseMock({
      table: 'series_favorite',
      existing: false,
      mutateError: new Error('NetworkError'),
    })
    const { client: oshiClient } = buildToggleSupabaseMock({
      table: 'episode_oshi',
      existing: false,
      selectError: new Error('boom'),
    })
    const favoriteProvider = createWorkPageDataProvider(favoriteClient)
    const oshiProvider = createWorkPageDataProvider(oshiClient)

    await expect(favoriteProvider.toggleSeriesFavorite('series-1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
    await expect(oshiProvider.toggleEpisodeOshi('episode-1')).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
  })
})
