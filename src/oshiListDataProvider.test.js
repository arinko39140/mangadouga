import { describe, expect, it, vi } from 'vitest'
import { createOshiListDataProvider } from './oshiListDataProvider.js'

const buildOshiListSupabaseMock = ({
  listRows = [],
  listError = null,
  listMovieRows = [],
  listMovieError = null,
} = {}) => {
  const listLimitMock = vi
    .fn()
    .mockResolvedValue({ data: listRows, error: listError })
  const listOrderMock = vi.fn().mockReturnValue({ limit: listLimitMock })
  const listSelectMock = vi.fn().mockReturnValue({ order: listOrderMock })

  const listMovieEqMovieMock = vi
    .fn()
    .mockResolvedValue({ data: listMovieRows, error: listMovieError })
  const listMovieEqListMock = vi.fn().mockReturnValue({ eq: listMovieEqMovieMock })
  const listMovieSelectMock = vi
    .fn()
    .mockReturnValue({ eq: listMovieEqListMock })

  const fromMock = vi.fn((table) => {
    if (table === 'list') {
      return { select: listSelectMock }
    }
    if (table === 'list_movie') {
      return { select: listMovieSelectMock }
    }
    return { select: vi.fn() }
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
    },
  }
}

describe('OshiListDataProvider', () => {
  it('list_movieを起点に登録済み推しを正規化して返す', async () => {
    const listRows = [{ list_id: 1 }]
    const listMovieRows = [
      {
        movie: {
          movie_id: 'movie-1',
          movie_title: 'テスト動画',
          url: '/watch/1',
          thumbnail_url: '/thumb/1.png',
          update: '2026-01-01T00:00:00Z',
          series_id: 'series-1',
        },
      },
    ]
    const { client, calls } = buildOshiListSupabaseMock({
      listRows,
      listMovieRows,
    })
    const provider = createOshiListDataProvider(client)

    const result = await provider.fetchOshiList()

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.listOrderMock).toHaveBeenCalledWith('list_id', { ascending: true })
    expect(calls.listLimitMock).toHaveBeenCalledWith(1)
    expect(calls.fromMock).toHaveBeenCalledWith('list_movie')
    expect(calls.listMovieSelectMock).toHaveBeenCalledWith(
      'movie:movie_id (movie_id, movie_title, url, thumbnail_url, update, series_id)'
    )
    expect(calls.listMovieEqListMock).toHaveBeenCalledWith('list_id', 1)
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 'movie-1',
          title: 'テスト動画',
          thumbnailUrl: '/thumb/1.png',
          publishedAt: '2026-01-01T00:00:00Z',
          videoUrl: '/watch/1',
          seriesId: 'series-1',
          isOshi: true,
        },
      ],
    })
  })

  it('必須項目が欠損している行は除外する', async () => {
    const listRows = [{ list_id: 1 }]
    const listMovieRows = [
      { movie: null },
      {
        movie: {
          movie_id: 'movie-1',
          movie_title: 'テスト動画',
          url: '/watch/1',
          thumbnail_url: null,
          update: null,
          series_id: null,
        },
      },
      {
        movie: {
          movie_id: null,
          movie_title: '欠損',
          url: '/watch/2',
          thumbnail_url: null,
          update: null,
          series_id: null,
        },
      },
      {
        movie: {
          movie_id: 'movie-3',
          movie_title: null,
          url: '/watch/3',
          thumbnail_url: null,
          update: null,
          series_id: null,
        },
      },
    ]
    const { client } = buildOshiListSupabaseMock({
      listRows,
      listMovieRows,
    })
    const provider = createOshiListDataProvider(client)

    const result = await provider.fetchOshiList()

    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: 'movie-1',
          title: 'テスト動画',
          thumbnailUrl: null,
          publishedAt: null,
          videoUrl: '/watch/1',
          seriesId: null,
          isOshi: true,
        },
      ],
    })
  })

  it('Supabase未設定の場合はnot_configuredとして返す', async () => {
    const provider = createOshiListDataProvider(null)

    await expect(provider.fetchOshiList()).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client } = buildOshiListSupabaseMock({
      listRows: [{ list_id: 1 }],
      listMovieError: new Error('Failed to fetch'),
    })
    const provider = createOshiListDataProvider(client)

    await expect(provider.fetchOshiList()).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })

  it('不明な失敗時はunknownとして返す', async () => {
    const { client } = buildOshiListSupabaseMock({
      listRows: [{ list_id: 1 }],
      listMovieError: new Error('boom'),
    })
    const provider = createOshiListDataProvider(client)

    await expect(provider.fetchOshiList()).resolves.toEqual({
      ok: false,
      error: 'unknown',
    })
  })
})
