import { describe, expect, it, vi } from 'vitest'
import { createUserOshiListProvider } from './userOshiListProvider.js'

const buildUserOshiListSupabaseMock = ({
  listRows = [],
  listError = null,
  userRows = [],
  userError = null,
  favoriteRows = [],
  favoriteError = null,
  sessionUserId = 'viewer-1',
  sessionError = null,
} = {}) => {
  const listLimitMock = vi.fn().mockResolvedValue({ data: listRows, error: listError })
  const listOrderMock = vi.fn().mockReturnValue({ limit: listLimitMock })
  const listEqMock = vi.fn().mockReturnValue({ order: listOrderMock })
  const listSelectMock = vi.fn().mockReturnValue({ eq: listEqMock })

  const userListLimitMock = vi
    .fn()
    .mockResolvedValue({ data: favoriteRows, error: favoriteError })
  const userListEqMock = vi.fn()
  userListEqMock.mockReturnValue({ eq: userListEqMock, limit: userListLimitMock })
  const userListSelectMock = vi.fn().mockReturnValue({ eq: userListEqMock })

  const usersLimitMock = vi.fn().mockResolvedValue({ data: userRows, error: userError })
  const usersEqMock = vi.fn().mockReturnValue({ limit: usersLimitMock })
  const usersSelectMock = vi.fn().mockReturnValue({ eq: usersEqMock })

  const fromMock = vi.fn((table) => {
    if (table === 'list') {
      return { select: listSelectMock }
    }
    if (table === 'user_list') {
      return { select: userListSelectMock }
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
      listSelectMock,
      listEqMock,
      listOrderMock,
      listLimitMock,
      userListSelectMock,
      userListEqMock,
      userListLimitMock,
      usersSelectMock,
      usersEqMock,
      usersLimitMock,
      getSessionMock,
    },
  }
}

const buildToggleSupabaseMock = ({
  listRows = [{ list_id: 1, can_display: true }],
  listError = null,
  favoriteRows = [],
  favoriteError = null,
  insertError = null,
  deleteError = null,
  sessionUserId = 'viewer-1',
  sessionError = null,
} = {}) => {
  const listLimitMock = vi.fn().mockResolvedValue({ data: listRows, error: listError })
  const listEqMock = vi.fn().mockReturnValue({ limit: listLimitMock })
  const listSelectMock = vi.fn().mockReturnValue({ eq: listEqMock })

  const favoriteLimitMock = vi
    .fn()
    .mockResolvedValue({ data: favoriteRows, error: favoriteError })
  const favoriteEqMock = vi.fn()
  favoriteEqMock.mockReturnValue({ eq: favoriteEqMock, limit: favoriteLimitMock })
  const favoriteSelectMock = vi.fn().mockReturnValue({ eq: favoriteEqMock })

  const insertMock = vi.fn().mockResolvedValue({ data: null, error: insertError })
  const deleteEqMock = vi.fn()
  deleteEqMock
    .mockReturnValueOnce({ eq: deleteEqMock })
    .mockResolvedValueOnce({ data: null, error: deleteError })
  const deleteMock = vi.fn().mockReturnValue({ eq: deleteEqMock })

  const fromMock = vi.fn((table) => {
    if (table === 'list') {
      return { select: listSelectMock }
    }
    if (table === 'user_list') {
      return { select: favoriteSelectMock, insert: insertMock, delete: deleteMock }
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
      listLimitMock,
      favoriteSelectMock,
      favoriteEqMock,
      favoriteLimitMock,
      insertMock,
      deleteMock,
      deleteEqMock,
      getSessionMock,
    },
  }
}

describe('UserOshiListProvider', () => {
  it('公開リストの概要とお気に入り状態を返す', async () => {
    const { client, calls } = buildUserOshiListSupabaseMock({
      listRows: [{ list_id: 12, favorite_count: 4, can_display: true }],
      favoriteRows: [{ list_id: 12 }],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.fetchListSummary({
      targetUserId: 'user-1',
      viewerUserId: 'viewer-1',
    })

    expect(calls.listSelectMock).toHaveBeenCalledWith(
      'list_id, favorite_count, can_display'
    )
    expect(calls.listEqMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(calls.listOrderMock).toHaveBeenCalledWith('list_id', { ascending: true })
    expect(calls.listLimitMock).toHaveBeenCalledWith(1)
    expect(calls.userListSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.userListEqMock).toHaveBeenNthCalledWith(1, 'user_id', 'viewer-1')
    expect(calls.userListEqMock).toHaveBeenNthCalledWith(2, 'list_id', '12')
    expect(calls.userListLimitMock).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      ok: true,
      data: {
        listId: '12',
        status: 'public',
        favoriteCount: 4,
        isFavorited: true,
      },
    })
  })

  it('お気に入り数が未設定でも公開リストとして0を返す', async () => {
    const { client } = buildUserOshiListSupabaseMock({
      listRows: [{ list_id: 20, favorite_count: null, can_display: true }],
      favoriteRows: [],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.fetchListSummary({
      targetUserId: 'user-10',
      viewerUserId: 'viewer-1',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        listId: '20',
        status: 'public',
        favoriteCount: 0,
        isFavorited: false,
      },
    })
  })

  it('閲覧者が未指定ならお気に入り判定を行わない', async () => {
    const { client, calls } = buildUserOshiListSupabaseMock({
      listRows: [{ list_id: 7, favorite_count: 2, can_display: true }],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.fetchListSummary({
      targetUserId: 'user-7',
      viewerUserId: null,
    })

    expect(calls.userListSelectMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: true,
      data: {
        listId: '7',
        status: 'public',
        favoriteCount: 2,
        isFavorited: false,
      },
    })
  })

  it('非公開リストは内容を返さずprivateとして扱う', async () => {
    const { client, calls } = buildUserOshiListSupabaseMock({
      listRows: [{ list_id: 9, favorite_count: 10, can_display: false }],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.fetchListSummary({
      targetUserId: 'user-2',
      viewerUserId: 'viewer-1',
    })

    expect(calls.userListSelectMock).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: true,
      data: {
        listId: null,
        status: 'private',
        favoriteCount: null,
        isFavorited: false,
      },
    })
  })

  it('本人閲覧時は非公開でも概要を返す', async () => {
    const { client, calls } = buildUserOshiListSupabaseMock({
      listRows: [{ list_id: 5, favorite_count: 1, can_display: false }],
      favoriteRows: [],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.fetchListSummary({
      targetUserId: 'user-5',
      viewerUserId: 'user-5',
    })

    expect(calls.userListSelectMock).toHaveBeenCalledWith('list_id')
    expect(result).toEqual({
      ok: true,
      data: {
        listId: '5',
        status: 'public',
        favoriteCount: 1,
        isFavorited: false,
      },
    })
  })

  it('リスト未作成の場合はnoneとして返す', async () => {
    const { client, calls } = buildUserOshiListSupabaseMock({
      listRows: [],
      userRows: [{ user_id: 'user-3' }],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.fetchListSummary({
      targetUserId: 'user-3',
      viewerUserId: 'viewer-1',
    })

    expect(calls.usersSelectMock).toHaveBeenCalledWith('user_id')
    expect(calls.usersEqMock).toHaveBeenCalledWith('user_id', 'user-3')
    expect(calls.usersLimitMock).toHaveBeenCalledWith(1)
    expect(result).toEqual({
      ok: true,
      data: {
        listId: null,
        status: 'none',
        favoriteCount: null,
        isFavorited: false,
      },
    })
  })

  it('ユーザーが存在しない場合はnot_foundとして返す', async () => {
    const { client } = buildUserOshiListSupabaseMock({
      listRows: [],
      userRows: [],
    })
    const provider = createUserOshiListProvider(client)

    await expect(
      provider.fetchListSummary({
        targetUserId: 'user-404',
        viewerUserId: 'viewer-1',
      })
    ).resolves.toEqual({
      ok: true,
      data: {
        listId: null,
        status: 'not_found',
        favoriteCount: null,
        isFavorited: false,
      },
    })
  })

  it('ユーザーIDが空ならinvalid_inputとして返す', async () => {
    const { client, calls } = buildUserOshiListSupabaseMock()
    const provider = createUserOshiListProvider(client)

    await expect(
      provider.fetchListSummary({ targetUserId: '  ', viewerUserId: 'viewer-1' })
    ).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
    expect(calls.fromMock).not.toHaveBeenCalled()
  })

  it('Supabase未設定の場合はnot_configuredとして返す', async () => {
    const provider = createUserOshiListProvider(null)

    await expect(
      provider.fetchListSummary({ targetUserId: 'user-1', viewerUserId: 'viewer-1' })
    ).resolves.toEqual({
      ok: false,
      error: 'not_configured',
    })
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client } = buildUserOshiListSupabaseMock({
      listError: new Error('Failed to fetch'),
    })
    const provider = createUserOshiListProvider(client)

    await expect(
      provider.fetchListSummary({ targetUserId: 'user-1', viewerUserId: 'viewer-1' })
    ).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })

  it('お気に入り未登録なら追加してtrueを返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      favoriteRows: [],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.toggleFavorite('1')

    expect(calls.getSessionMock).toHaveBeenCalled()
    expect(calls.listSelectMock).toHaveBeenCalledWith('list_id, can_display')
    expect(calls.listEqMock).toHaveBeenCalledWith('list_id', '1')
    expect(calls.listLimitMock).toHaveBeenCalledWith(1)
    expect(calls.favoriteSelectMock).toHaveBeenCalledWith('list_id')
    expect(calls.favoriteEqMock).toHaveBeenNthCalledWith(1, 'user_id', 'viewer-1')
    expect(calls.favoriteEqMock).toHaveBeenNthCalledWith(2, 'list_id', '1')
    expect(calls.favoriteLimitMock).toHaveBeenCalledWith(1)
    expect(calls.insertMock).toHaveBeenCalledWith({
      user_id: 'viewer-1',
      list_id: '1',
    })
    expect(result).toEqual({ ok: true, data: { isFavorited: true } })
  })

  it('お気に入り登録済みなら解除してfalseを返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      favoriteRows: [{ list_id: 1 }],
    })
    const provider = createUserOshiListProvider(client)

    const result = await provider.toggleFavorite('1')

    expect(calls.deleteMock).toHaveBeenCalled()
    expect(calls.deleteEqMock).toHaveBeenNthCalledWith(1, 'user_id', 'viewer-1')
    expect(calls.deleteEqMock).toHaveBeenNthCalledWith(2, 'list_id', '1')
    expect(result).toEqual({ ok: true, data: { isFavorited: false } })
  })

  it('非公開リストはinvalid_inputとして返す', async () => {
    const { client, calls } = buildToggleSupabaseMock({
      listRows: [{ list_id: 1, can_display: false }],
    })
    const provider = createUserOshiListProvider(client)

    await expect(provider.toggleFavorite('1')).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
    expect(calls.favoriteSelectMock).not.toHaveBeenCalled()
  })

  it('ユーザーID未ログイン時はauth_requiredとして返す', async () => {
    const { client } = buildToggleSupabaseMock({ sessionUserId: null })
    const provider = createUserOshiListProvider(client)

    await expect(provider.toggleFavorite('1')).resolves.toEqual({
      ok: false,
      error: 'auth_required',
    })
  })

  it('無効なリストIDはinvalid_inputとして返す', async () => {
    const { client, calls } = buildToggleSupabaseMock()
    const provider = createUserOshiListProvider(client)

    await expect(provider.toggleFavorite('  ')).resolves.toEqual({
      ok: false,
      error: 'invalid_input',
    })
    expect(calls.fromMock).not.toHaveBeenCalled()
  })

  it('通信失敗時はnetworkとして返す', async () => {
    const { client } = buildToggleSupabaseMock({
      insertError: new Error('Failed to fetch'),
    })
    const provider = createUserOshiListProvider(client)

    await expect(provider.toggleFavorite('1')).resolves.toEqual({
      ok: false,
      error: 'network',
    })
  })
})
