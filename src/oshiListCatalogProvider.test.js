import { describe, expect, it, vi } from 'vitest'
import { createOshiListCatalogProvider } from './oshiListCatalogProvider.js'

const buildCatalogSupabaseMock = ({ rows = [], error = null } = {}) => {
  const orderMock = vi.fn().mockResolvedValue({ data: rows, error })
  const selectMock = vi.fn().mockReturnValue({ order: orderMock })
  const fromMock = vi.fn().mockReturnValue({ select: selectMock })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, orderMock },
  }
}

const buildToggleSupabaseMock = ({
  existing = false,
  selectError = null,
  insertError = null,
  deleteError = null,
} = {}) => {
  const limitMock = vi.fn().mockResolvedValue({
    data: existing ? [{ target_list_id: 1 }] : [],
    error: selectError,
  })
  const eqMock = vi.fn().mockReturnValue({ limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: insertError })
  const deleteEqMock = vi.fn().mockResolvedValue({ data: null, error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock })
  const fromMock = vi.fn().mockReturnValue({
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
  })

  return {
    client: { from: fromMock },
    calls: { fromMock, selectMock, eqMock, limitMock, insertMock, deleteMock, deleteEqMock },
  }
}

describe('OshiListCatalogProvider', () => {
  it('お気に入り数の多い順で公開一覧を取得して整形する', async () => {
    const { client, calls } = buildCatalogSupabaseMock({
      rows: [
        {
          list_id: 1,
          user_id: 'user-1',
          name: '推しリスト',
          favorite_count: 5,
          can_display: true,
          is_favorited: true,
        },
      ],
    })
    const provider = createOshiListCatalogProvider(client)

    const result = await provider.fetchCatalog({ sortOrder: 'favorite_desc' })

    expect(calls.fromMock).toHaveBeenCalledWith('oshi_list_catalog')
    expect(calls.selectMock).toHaveBeenCalledWith(
      'list_id, user_id, name, favorite_count, can_display, is_favorited'
    )
    expect(calls.orderMock).toHaveBeenCalledWith('favorite_count', { ascending: false })
    expect(result).toEqual({
      ok: true,
      data: [
        {
          listId: '1',
          userId: 'user-1',
          name: '推しリスト',
          favoriteCount: 5,
          isFavorited: true,
          visibility: 'public',
        },
      ],
    })
  })

  it('お気に入り数の少ない順で取得する', async () => {
    const { client, calls } = buildCatalogSupabaseMock()
    const provider = createOshiListCatalogProvider(client)

    await provider.fetchCatalog({ sortOrder: 'favorite_asc' })

    expect(calls.orderMock).toHaveBeenCalledWith('favorite_count', { ascending: true })
  })

  it('未認証時はauth_requiredとして返す', async () => {
    const { client } = buildCatalogSupabaseMock({
      error: { status: 401, message: 'JWT expired' },
    })
    const provider = createOshiListCatalogProvider(client)

    await expect(provider.fetchCatalog({ sortOrder: 'favorite_desc' })).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    })
  })

  it('お気に入り未登録なら追加してtrueを返す', async () => {
    const { client, calls } = buildToggleSupabaseMock()
    const provider = createOshiListCatalogProvider(client)

    const result = await provider.toggleFavorite('1')

    expect(calls.fromMock).toHaveBeenCalledWith('oshi_list_favorite')
    expect(calls.selectMock).toHaveBeenCalledWith('target_list_id')
    expect(calls.eqMock).toHaveBeenCalledWith('target_list_id', '1')
    expect(calls.insertMock).toHaveBeenCalledWith({ target_list_id: '1' })
    expect(result).toEqual({ ok: true, data: { isFavorited: true } })
  })

  it('お気に入り登録済みなら解除してfalseを返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({ existing: true })
    const provider = createOshiListCatalogProvider(client)

    const result = await provider.toggleFavorite('1')

    expect(calls.deleteMock).toHaveBeenCalled()
    expect(calls.deleteEqMock).toHaveBeenCalledWith('target_list_id', '1')
    expect(result).toEqual({ ok: true, data: { isFavorited: false } })
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client } = buildToggleSupabaseMock({
      insertError: new Error('Failed to fetch'),
    })
    const provider = createOshiListCatalogProvider(client)

    await expect(provider.toggleFavorite('1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })
})
