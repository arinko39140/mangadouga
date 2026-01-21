import { describe, expect, it, vi } from 'vitest'
import { createOshiFavoritesProvider } from './oshiFavoritesProvider.js'

const buildFavoritesSupabaseMock = ({
  favoriteRows = [],
  favoriteError = null,
  listRows = [],
  listError = null,
  usersRows = [],
  usersError = null,
  sessionUserId = 'user-1',
  sessionError = null,
} = {}) => {
  const favoriteEqMock = vi.fn().mockResolvedValue({
    data: favoriteRows,
    error: favoriteError,
  })
  const favoriteSelectMock = vi.fn().mockReturnValue({ eq: favoriteEqMock })
  const listEqMock = vi.fn().mockResolvedValue({ data: listRows, error: listError })
  const listInMock = vi.fn().mockReturnValue({ eq: listEqMock })
  const listSelectMock = vi.fn().mockReturnValue({ in: listInMock })
  const usersInMock = vi.fn().mockResolvedValue({ data: usersRows, error: usersError })
  const usersSelectMock = vi.fn().mockReturnValue({ in: usersInMock })

  const fromMock = vi.fn((table) => {
    if (table === 'user_list') {
      return { select: favoriteSelectMock }
    }
    if (table === 'list') {
      return { select: listSelectMock }
    }
    if (table === 'users') {
      return { select: usersSelectMock }
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
      favoriteSelectMock,
      favoriteEqMock,
      listSelectMock,
      listInMock,
      listEqMock,
      usersSelectMock,
      usersInMock,
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
  const eqMock = vi.fn()
  eqMock.mockReturnValue({ eq: eqMock, limit: limitMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  const insertMock = vi.fn().mockResolvedValue({ data: null, error: insertError })
  const deleteEqMock = vi.fn()
  deleteEqMock
    .mockReturnValueOnce({ eq: deleteEqMock })
    .mockResolvedValueOnce({ data: null, error: deleteError })
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

describe('OshiFavoritesProvider', () => {
  it('登録済み推しリストのみを重複なしで返す', async () => {
    const { client, calls } = buildFavoritesSupabaseMock({
      favoriteRows: [{ list_id: 1 }, { list_id: 1 }, { list_id: 2 }],
      listRows: [
        {
          list_id: 1,
          user_id: 'user-1',
          favorite_count: 3,
          can_display: true,
        },
      ],
      usersRows: [
        { user_id: 'user-1', name: '推しリスト' },
      ],
    })
    const provider = createOshiFavoritesProvider(client)

    const result = await provider.fetchFavorites()

    expect(calls.getSessionMock).toHaveBeenCalled()
    expect(calls.fromMock).toHaveBeenCalledWith('user_list')
    expect(calls.favoriteSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.fromMock).toHaveBeenCalledWith('list')
    expect(calls.listSelectMock).toHaveBeenCalledWith(
      'list_id, user_id, favorite_count, can_display'
    )
    expect(calls.listInMock).toHaveBeenCalledWith('list_id', ['1', '2'])
    expect(calls.listEqMock).toHaveBeenCalledWith('can_display', true)
    expect(calls.fromMock).toHaveBeenCalledWith('users')
    expect(calls.usersSelectMock).toHaveBeenCalledWith('user_id, name')
    expect(calls.usersInMock).toHaveBeenCalledWith('user_id', ['user-1'])
    expect(result).toEqual({
      ok: true,
      data: [
        {
          listId: '1',
          userId: 'user-1',
          name: '推しリスト',
          favoriteCount: 3,
          isFavorited: true,
        },
      ],
    })
  })

  it('未認証時はauth_requiredとして返す', async () => {
    const { client } = buildFavoritesSupabaseMock({
      sessionUserId: null,
    })
    const provider = createOshiFavoritesProvider(client)

    await expect(provider.fetchFavorites()).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    })
  })

  it('無効なリスト指定はinvalid_inputとして返す', async () => {
    const provider = createOshiFavoritesProvider({ from: vi.fn() })

    await expect(provider.toggleFavorite('')).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
  })

  it('お気に入り未登録なら追加してtrueを返す', async () => {
    const { client, calls } = buildToggleSupabaseMock()
    const provider = createOshiFavoritesProvider(client)

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
    const provider = createOshiFavoritesProvider(client)

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
    const provider = createOshiFavoritesProvider(client)

    await expect(provider.toggleFavorite('1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })
})
