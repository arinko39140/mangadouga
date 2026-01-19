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

const mapCatalogRow = (row) => ({
  listId: row.list_id != null ? String(row.list_id) : '',
  userId: row.user_id != null ? String(row.user_id) : '',
  name: row.name ?? '',
  favoriteCount: row.favorite_count ?? 0,
  isFavorited: Boolean(row.is_favorited),
  visibility: row.can_display ? 'public' : 'private',
})

export const createOshiListCatalogProvider = (supabaseClient) => ({
  async fetchCatalog({ sortOrder }) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const ascending = sortOrder === 'favorite_asc'
    const { data, error } = await supabaseClient
      .from('oshi_list_catalog')
      .select('list_id, user_id, name, favorite_count, can_display, is_favorited')
      .order('favorite_count', { ascending })

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, data: (data ?? []).map(mapCatalogRow) }
  },

  async toggleFavorite(targetListId) {
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
