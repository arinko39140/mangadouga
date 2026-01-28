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

import { resolveCurrentUserId } from './supabaseSession.js'

const normalizeError = (error) => {
  if (error?.code === '23505') return 'conflict'
  if (isAuthError(error)) return 'auth_required'
  return isNetworkError(error) ? 'network' : 'unknown'
}

const mapCatalogRow = (row, userName, viewerUserId) => ({
  listId: row.list_id != null ? String(row.list_id) : '',
  userId: row.user_id != null ? String(row.user_id) : '',
  name: userName ?? '',
  favoriteCount: row.favorite_count ?? 0,
  isFavorited: Boolean(row.is_favorited),
  visibility: row.can_display ? 'public' : 'private',
  isOwner:
    typeof viewerUserId === 'string' &&
    viewerUserId !== '' &&
    String(row.user_id) === viewerUserId,
})

export const createOshiListCatalogProvider = (supabaseClient) => ({
  async fetchCatalog({ sortOrder }) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }
    const userId = userResult.userId

    const ascending = sortOrder === 'favorite_asc'
    const { data: listData, error: listError } = await supabaseClient
      .from('list')
      .select('list_id, user_id, favorite_count, can_display')
      .eq('can_display', true)
      .order('favorite_count', { ascending })

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

    const { data: favoriteData, error: favoriteError } = await supabaseClient
      .from('user_list')
      .select('list_id')
      .eq('user_id', userId)

    if (favoriteError) {
      return { ok: false, error: normalizeError(favoriteError) }
    }

    const favoriteSet = new Set(
      (favoriteData ?? []).map((row) => String(row.list_id))
    )
    const items = (listData ?? []).map((row) => {
      const mappedUserId = row.user_id != null ? String(row.user_id) : ''
      const userName = userNameMap.get(mappedUserId) ?? ''
      const isOwner = mappedUserId === userId
      return {
        ...mapCatalogRow(row, userName, userId),
        isFavorited: isOwner ? false : favoriteSet.has(String(row.list_id)),
      }
    })

    return { ok: true, data: items }
  },

  async toggleFavorite(targetListId) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }

    const { data, error } = await supabaseClient
      .from('user_list')
      .select('list_id')
      .eq('user_id', userResult.userId)
      .eq('list_id', targetListId)
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const exists = (data ?? []).length > 0

    if (exists) {
      const { error: deleteError } = await supabaseClient
        .from('user_list')
        .delete()
        .eq('user_id', userResult.userId)
        .eq('list_id', targetListId)

      if (deleteError) {
        return { ok: false, error: normalizeError(deleteError) }
      }

      return { ok: true, data: { isFavorited: false } }
    }

    const { error: insertError } = await supabaseClient
      .from('user_list')
      .insert({ user_id: userResult.userId, list_id: targetListId })

    if (insertError) {
      return { ok: false, error: normalizeError(insertError) }
    }

    return { ok: true, data: { isFavorited: true } }
  },
})
