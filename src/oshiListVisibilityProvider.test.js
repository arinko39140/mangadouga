import { describe, expect, it, vi } from 'vitest'
import { createOshiListVisibilityProvider } from './oshiListVisibilityProvider.js'

const buildVisibilitySupabaseMock = ({ rows = [], error = null } = {}) => {
  const eqMock = vi.fn().mockResolvedValue({ data: rows, error })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock },
  }
}

const buildUpdateSupabaseMock = ({ rows = [], error = null } = {}) => {
  const selectMock = vi.fn().mockResolvedValue({ data: rows, error })
  const eqMock = vi.fn().mockReturnValue({ select: selectMock })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ update: updateMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, updateMock, eqMock, selectMock },
  }
}

describe('OshiListVisibilityProvider', () => {
  it('公開/非公開状態を取得する', async () => {
    const { client, calls } = buildVisibilitySupabaseMock({
      rows: [{ can_display: true }],
    })
    const provider = createOshiListVisibilityProvider(client)

    const result = await provider.fetchVisibility('1')

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.selectMock).toHaveBeenCalledWith('can_display, user_id')
    expect(calls.eqMock).toHaveBeenCalledWith('list_id', '1')
    expect(result).toEqual({ ok: true, data: { visibility: 'public' } })
  })

  it('非公開の場合はprivateを返す', async () => {
    const { client } = buildVisibilitySupabaseMock({
      rows: [{ can_display: false }],
    })
    const provider = createOshiListVisibilityProvider(client)

    await expect(provider.fetchVisibility('1')).resolves.toEqual({
      ok: true,
      data: { visibility: 'private' },
    })
  })

  it('所有者以外の更新はforbiddenとして返す', async () => {
    const { client } = buildUpdateSupabaseMock({
      rows: [],
      error: { code: '42501', message: 'permission denied' },
    })
    const provider = createOshiListVisibilityProvider(client)

    await expect(provider.updateVisibility('1', 'public')).resolves.toEqual({
      ok: false,
      error: 'forbidden',
    })
  })

  it('認証切れはauth_requiredとして返す', async () => {
    const { client } = buildUpdateSupabaseMock({
      rows: [],
      error: { status: 401, message: 'JWT expired' },
    })
    const provider = createOshiListVisibilityProvider(client)

    await expect(provider.updateVisibility('1', 'public')).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    })
  })

  it('更新が成功したら最新状態を返す', async () => {
    const { client, calls } = buildUpdateSupabaseMock({
      rows: [{ can_display: false }],
    })
    const provider = createOshiListVisibilityProvider(client)

    const result = await provider.updateVisibility('1', 'private')

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.updateMock).toHaveBeenCalledWith({ can_display: false })
    expect(calls.eqMock).toHaveBeenCalledWith('list_id', '1')
    expect(calls.selectMock).toHaveBeenCalledWith('can_display')
    expect(result).toEqual({ ok: true, data: { visibility: 'private' } })
  })
})
