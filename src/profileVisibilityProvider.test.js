import { describe, expect, it, vi } from 'vitest'
import { createProfileVisibilityProvider } from './profileVisibilityProvider.js'

const buildSupabaseMock = ({ rows = [], error = null } = {}) => {
  const limitMock = vi.fn().mockResolvedValue({ data: rows, error })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock, limitMock },
  }
}

describe('ProfileVisibilityProvider', () => {
  it('profile_visibilityから可視性を取得する', async () => {
    const { client, calls } = buildSupabaseMock({
      rows: [
        {
          oshi_list_visibility: 'public',
          oshi_series_visibility: 'private',
        },
      ],
    })
    const provider = createProfileVisibilityProvider(client)

    const result = await provider.fetchVisibility({ targetUserId: 'user-1' })

    expect(calls.fromMock).toHaveBeenCalledWith('profile_visibility')
    expect(calls.selectMock).toHaveBeenCalledWith(
      'oshi_list_visibility, oshi_series_visibility'
    )
    expect(calls.eqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.limitMock).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      ok: true,
      data: {
        oshiList: 'public',
        oshiSeries: 'private',
      },
    })
  })

  it('可視性が未設定ならprivateとして返す', async () => {
    const { client } = buildSupabaseMock({ rows: [] })
    const provider = createProfileVisibilityProvider(client)

    await expect(provider.fetchVisibility({ targetUserId: 'user-1' })).resolves.toEqual({
      ok: true,
      data: { oshiList: 'private', oshiSeries: 'private' },
    })
  })

  it('取得失敗時はprivateとして返す', async () => {
    const { client } = buildSupabaseMock({ error: new Error('Failed to fetch') })
    const provider = createProfileVisibilityProvider(client)

    await expect(provider.fetchVisibility({ targetUserId: 'user-1' })).resolves.toEqual({
      ok: true,
      data: { oshiList: 'private', oshiSeries: 'private' },
    })
  })

  it('Supabase未設定でもprivateとして返す', async () => {
    const provider = createProfileVisibilityProvider(null)

    await expect(provider.fetchVisibility({ targetUserId: 'user-1' })).resolves.toEqual({
      ok: true,
      data: { oshiList: 'private', oshiSeries: 'private' },
    })
  })

  it('ユーザーIDが空ならinvalid_inputを返す', async () => {
    const { client, calls } = buildSupabaseMock()
    const provider = createProfileVisibilityProvider(client)

    await expect(provider.fetchVisibility({ targetUserId: '  ' })).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
    expect(calls.fromMock).not.toHaveBeenCalled()
  })
})
