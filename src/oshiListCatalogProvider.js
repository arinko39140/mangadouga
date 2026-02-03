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

const mapCatalogRow = (row, userName, iconUrl, viewerUserId) => ({
  listId: row.list_id != null ? String(row.list_id) : '',
  userId: row.user_id != null ? String(row.user_id) : '',
  name: userName ?? '',
  iconUrl: iconUrl ?? null,
  favoriteCount: row.favorite_count ?? 0,
  isFavorited: Boolean(row.is_favorited),
  visibility: row.can_display ? 'public' : 'private',
  isOwner:
    typeof viewerUserId === 'string' &&
    viewerUserId !== '' &&
    String(row.user_id) === viewerUserId,
})

const normalizeSortOrder = (sortOrder) => {
  if (sortOrder === 'popular') return 'popular'
  if (sortOrder === 'latest') return 'popular'
  if (sortOrder === 'favorite_desc' || sortOrder === 'favorite_asc') return 'popular'
  return 'popular'
}

const resolvePageRange = (page, pageSize) => {
  const safePage = Number.isInteger(page) && page >= 0 ? page : 0
  const start = safePage * pageSize
  return { start, end: start + pageSize - 1 }
}

export const createOshiListCatalogProvider = (supabaseClient) => ({
  async fetchCatalog({ sortOrder, page } = {}) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }
    const userId = userResult.userId

    const normalizedSortOrder = normalizeSortOrder(sortOrder)
    const { start, end } = resolvePageRange(page, 50)
    let query = supabaseClient
      .from('list')
      .select('list_id, user_id, favorite_count, can_display')
      .eq('can_display', true)
    if (normalizedSortOrder === 'popular') {
      query = query.order('favorite_count', { ascending: false }).order('update', {
        ascending: false,
      })
    }
    const { data: listData, error: listError } = await query.range(start, end)

    if (listError) {
      return { ok: false, error: normalizeError(listError) }
    }

    const userIds = Array.from(
      new Set((listData ?? []).map((row) => String(row.user_id)).filter(Boolean))
    )
    let userProfileMap = new Map()
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabaseClient
        .from('users')
        .select('user_id, name, icon_url')
        .in('user_id', userIds)

      if (usersError) {
        return { ok: false, error: normalizeError(usersError) }
      }

      userProfileMap = new Map(
        (usersData ?? []).map((row) => [
          String(row.user_id),
          { name: row.name ?? '', iconUrl: row.icon_url ?? null },
        ])
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
      const profile = userProfileMap.get(mappedUserId) ?? { name: '', iconUrl: null }
      const isOwner = mappedUserId === userId
      return {
        ...mapCatalogRow(row, profile.name, profile.iconUrl, userId),
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
