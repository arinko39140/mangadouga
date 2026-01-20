import { describe, expect, it, vi } from 'vitest'
import { createOshiListCatalogProvider } from './oshiListCatalogProvider.js'

const buildCatalogSupabaseMock = ({
  listRows = [],
  listError = null,
  favoriteRows = [],
  favoriteError = null,
  usersRows = [],
  usersError = null,
  sessionUserId = 'user-1',
  sessionError = null,
} = {}) => {
  const listOrderMock = vi.fn().mockResolvedValue({ data: listRows, error: listError })
  const listEqMock = vi.fn().mockReturnValue({ order: listOrderMock })
  const listSelectMock = vi.fn().mockReturnValue({ eq: listEqMock })

  const usersInMock = vi.fn().mockResolvedValue({ data: usersRows, error: usersError })
  const usersSelectMock = vi.fn().mockReturnValue({ in: usersInMock })

  const favoriteEqMock = vi
    .fn()
    .mockResolvedValue({ data: favoriteRows, error: favoriteError })
  const favoriteSelectMock = vi.fn().mockReturnValue({ eq: favoriteEqMock })

  const fromMock = vi.fn((table) => {
    if (table === 'list') {
      return { select: listSelectMock }
    }
    if (table === 'users') {
      return { select: usersSelectMock }
    }
    if (table === 'user_list') {
      return { select: favoriteSelectMock }
    }
    return { select: vi.fn() }
  })

  const getSessionMock = vi.fn().mockResolvedValue({
    data: sessionUserId ? { session: { user: { id: sessionUserId } } } : { session: null },
    error: sessionError,
  })

  return {
    client: { from: fromMock, auth: { getSession: getSessionMock } },
    calls: {
      fromMock,
      listSelectMock,
      listEqMock,
      listOrderMock,
      usersSelectMock,
      usersInMock,
      favoriteSelectMock,
      favoriteEqMock,
      getSessionMock,
    },
  }
}

const buildToggleSupabaseMock = ({
  existing = false,
  selectError = null,
  insertError = null,
  deleteError = null,
} = {}) => {
  const limitMock = vi.fn().mockResolvedValue({
    data: existing ? [{ list_id: 1 }] : [],
    error: selectError,
  })
  const eqMock = vi
    .fn()
    .mockReturnValue({ eq: eqMock, limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: insertError })
  const deleteEqMock = vi.fn().mockResolvedValue({ data: null, error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock })
  const fromMock = vi.fn().mockReturnValue({
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
  })
  const getSessionMock = vi.fn().mockResolvedValue({
    data: { session: { user: { id: 'user-1' } } },
    error: null,
  })

  return {
    client: { from: fromMock, auth: { getSession: getSessionMock } },
    calls: {
      fromMock,
      selectMock,
      eqMock,
      limitMock,
      insertMock,
      deleteMock,
      deleteEqMock,
      getSessionMock,
    },
  }
}

describe('OshiListCatalogProvider', () => {
  it('お気に入り数の多い順で公開一覧を取得して整形する', async () => {
    const { client, calls } = buildCatalogSupabaseMock({
      listRows: [
        {
          list_id: 1,
          user_id: 'user-1',
          favorite_count: 5,
          can_display: true,
        },
      ],
      usersRows: [{ user_id: 'user-1', name: '推しリスト' }],
      favoriteRows: [{ list_id: 1 }],
    })
    const provider = createOshiListCatalogProvider(client)

    const result = await provider.fetchCatalog({ sortOrder: 'favorite_desc' })

    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith(
      'list_id, user_id, favorite_count, can_display'
    )
    expect(calls.listEqMock).toHaveBeenCalledWith('can_display', true)
    expect(calls.listOrderMock).toHaveBeenCalledWith('favorite_count', { ascending: false })
    expect(calls.fromMock).toHaveBeenCalledWith('users')
    expect(calls.usersSelectMock).toHaveBeenCalledWith('user_id, name')
    expect(calls.usersInMock).toHaveBeenCalledWith('user_id', ['user-1'])
    expect(calls.fromMock).toHaveBeenCalledWith('user_list')
    expect(calls.favoriteSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.favoriteEqMock).toHaveBeenCalledWith('user_id', 'user-1')
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

    expect(calls.listOrderMock).toHaveBeenCalledWith('favorite_count', { ascending: true })
  })

  it('未認証時はauth_requiredとして返す', async () => {
    const { client } = buildCatalogSupabaseMock({
      sessionUserId: null,
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

    expect(calls.getSessionMock).toHaveBeenCalled()
    expect(calls.fromMock).toHaveBeenCalledWith('user_list')
    expect(calls.selectMock).toHaveBeenCalledWith('list_id')
    expect(calls.eqMock).toHaveBeenNthCalledWith(1, 'user_id', 'user-1')
    expect(calls.eqMock).toHaveBeenNthCalledWith(2, 'list_id', '1')
    expect(calls.insertMock).toHaveBeenCalledWith({ user_id: 'user-1', list_id: '1' })
    expect(result).toEqual({ ok: true, data: { isFavorited: true } })
  })

  it('お気に入り登録済みなら解除してfalseを返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({ existing: true })
    const provider = createOshiListCatalogProvider(client)

    const result = await provider.toggleFavorite('1')

    expect(calls.deleteMock).toHaveBeenCalled()
    expect(calls.deleteEqMock).toHaveBeenNthCalledWith(1, 'user_id', 'user-1')
    expect(calls.deleteEqMock).toHaveBeenNthCalledWith(2, 'list_id', '1')
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
