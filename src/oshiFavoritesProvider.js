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

const mapFavoriteRow = (row) => {
  const list = row?.list
  if (!list?.list_id || !list?.user_id) return null
  if (!list.can_display) return null
  return {
    listId: String(list.list_id),
    userId: String(list.user_id),
    name: list.users?.name ?? '',
    favoriteCount: list.favorite_count ?? 0,
    isFavorited: true,
  }
}

export const createOshiFavoritesProvider = (supabaseClient) => ({
  async fetchFavorites() {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('oshi_list_favorite')
      .select(
        'target_list_id, list:target_list_id (list_id, user_id, favorite_count, can_display, users (name))'
      )

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const items = new Map()
    ;(data ?? []).forEach((row) => {
      const item = mapFavoriteRow(row)
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
