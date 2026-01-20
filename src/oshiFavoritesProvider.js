const isNetworkError = (error) => {
  if (!error) return false
  const message = String(error.message ?? '')
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

const isAuthError = (error) => {
  if (!error) return false
  if (error.status === 401) return true
  const code = String(error.code ?? '')
  if (code === 'PGRST301') return true
  const message = String(error.message ?? '')
  return message.includes('JWT') || message.includes('auth') || message.includes('Authentication')
}

const normalizeError = (error) => {
  if (error?.code === '23505') return 'conflict'
  if (isAuthError(error)) return 'auth_required'
  return isNetworkError(error) ? 'network' : 'unknown'
}

const mapFavoriteRow = (list, userName) => {
  if (!list?.list_id || !list?.user_id) return null
  return {
    listId: String(list.list_id),
    userId: String(list.user_id),
    name: userName ?? '',
    favoriteCount: list.favorite_count ?? 0,
    isFavorited: true,
  }
}

export const createOshiFavoritesProvider = (supabaseClient) => ({
  async fetchFavorites() {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data: favoriteData, error: favoriteError } = await supabaseClient
      .from('oshi_list_favorite')
      .select('target_list_id')

    if (favoriteError) {
      return { ok: false, error: normalizeError(favoriteError) }
    }

    const targetIds = Array.from(
      new Set((favoriteData ?? []).map((row) => String(row.target_list_id)).filter(Boolean))
    )
    if (targetIds.length === 0) {
      return { ok: true, data: [] }
    }

    const { data: listData, error: listError } = await supabaseClient
      .from('list')
      .select('list_id, user_id, favorite_count, can_display')
      .in('list_id', targetIds)
      .eq('can_display', true)

    if (listError) {
      return { ok: false, error: normalizeError(listError) }
    }

    const userIds = Array.from(
      new Set((listData ?? []).map((row) => String(row.user_id)).filter(Boolean))
    )
    let userNameMap = new Map()
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseClient
        .from('users')
        .select('user_id, name')
        .in('user_id', userIds)

      if (usersError) {
        return { ok: false, error: normalizeError(usersError) }
      }

      userNameMap = new Map(
        (usersData ?? []).map((row) => [String(row.user_id), row.name ?? ''])
      )
    }

    const items = new Map()
    ;(listData ?? []).forEach((row) => {
      if (!row?.can_display) return
      const mappedUserId = row.user_id != null ? String(row.user_id) : ''
      const item = mapFavoriteRow(row, userNameMap.get(mappedUserId))
      if (!item) return
      if (!items.has(item.listId)) {
        items.set(item.listId, item)
      }
    })

    return { ok: true, data: Array.from(items.values()) }
  },

  async toggleFavorite(targetListId) {
    if (typeof targetListId !== 'string' || targetListId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('oshi_list_favorite')
      .select('target_list_id')
      .eq('target_list_id', targetListId)
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const exists = (data ?? []).length > 0

    if (exists) {
      const { error: deleteError } = await supabaseClient
        .from('oshi_list_favorite')
        .delete()
        .eq('target_list_id', targetListId)

      if (deleteError) {
        return { ok: false, error: normalizeError(deleteError) }
      }

      return { ok: true, data: { isFavorited: false } }
    }

    const { error: insertError } = await supabaseClient
      .from('oshi_list_favorite')
      .insert({ target_list_id: targetListId })

    if (insertError) {
      return { ok: false, error: normalizeError(insertError) }
    }

    return { ok: true, data: { isFavorited: true } }
  },
})
