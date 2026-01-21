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
})
