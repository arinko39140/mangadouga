import { resolveCurrentUserId } from './supabaseSession.js'

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
  if (isAuthError(error)) return 'auth_required'
  return isNetworkError(error) ? 'network' : 'unknown'
}

const buildPrivateSummary = (status) => ({
  listId: null,
  status,
  favoriteCount: null,
  isFavorited: false,
})

const mapListItem = (row) => ({
  movieId: row.movie_id,
  title: row.movie_title,
})

const fetchRecentListItems = async (supabaseClient, listId, limit) => {
  const resolvedLimit = Number.isFinite(limit) ? Math.max(0, limit) : 0
  if (!listId || resolvedLimit <= 0) return { ok: true, data: [] }

  const { data, error } = await supabaseClient
    .from('list_movie')
    .select('movie:movie_id (movie_id, movie_title), created_at')
    .eq('list_id', listId)
    .order('created_at', { ascending: false })
    .limit(resolvedLimit)

  if (error) {
    return { ok: false, error: normalizeError(error) }
  }

  const items = (data ?? [])
    .map((row) => row?.movie ?? null)
    .filter((movie) => movie?.movie_id && movie?.movie_title)
    .map(mapListItem)

  return { ok: true, data: items }
}

export const createUserOshiListProvider = (supabaseClient) => ({
  async fetchListSummary(input) {
    const targetUserId =
      typeof input === 'object' && input !== null ? input.targetUserId : null
    const viewerUserId =
      typeof input === 'object' && input !== null ? input.viewerUserId ?? null : null
    if (typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const isOwner =
      typeof viewerUserId === 'string' && viewerUserId.trim() === targetUserId

    const { data: listData, error: listError } = await supabaseClient
      .from('list')
      .select('list_id, favorite_count, can_display')
      .eq('user_id', targetUserId)
      .order('list_id', { ascending: true })
      .limit(1)

    if (listError) {
      return { ok: false, error: normalizeError(listError) }
    }

    const listRow = listData?.[0]
    if (!listRow) {
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('user_id')
        .eq('user_id', targetUserId)
        .limit(1)

      if (userError) {
        return { ok: false, error: normalizeError(userError) }
      }

      if (!userData?.[0]) {
        return { ok: true, data: buildPrivateSummary('not_found') }
      }

      return { ok: true, data: buildPrivateSummary('none') }
    }

    if (!isOwner && !listRow.can_display) {
      return { ok: true, data: buildPrivateSummary('private') }
    }

    const listId = listRow.list_id != null ? String(listRow.list_id) : ''
    if (!listId) {
      return { ok: true, data: buildPrivateSummary('none') }
    }

    const itemsResult = await fetchRecentListItems(supabaseClient, listId, 3)
    if (!itemsResult.ok) {
      return { ok: false, error: itemsResult.error }
    }

    if (!viewerUserId) {
      return {
        ok: true,
        data: {
          listId,
          status: 'public',
          favoriteCount: listRow.favorite_count ?? 0,
          isFavorited: false,
          items: itemsResult.data,
        },
      }
    }

    const { data: favoriteData, error: favoriteError } = await supabaseClient
      .from('user_list')
      .select('list_id')
      .eq('user_id', viewerUserId)
      .eq('list_id', listId)
      .limit(1)

    if (favoriteError) {
      return { ok: false, error: normalizeError(favoriteError) }
    }

    return {
      ok: true,
      data: {
        listId,
        status: 'public',
        favoriteCount: listRow.favorite_count ?? 0,
        isFavorited: (favoriteData ?? []).length > 0,
        items: itemsResult.data,
      },
    }
  },

  async toggleFavorite(listId) {
    if (typeof listId !== 'string' || listId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const trimmedListId = listId.trim()
    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }

    const { data: listData, error: listError } = await supabaseClient
      .from('list')
      .select('list_id, can_display')
      .eq('list_id', trimmedListId)
      .limit(1)

    if (listError) {
      return { ok: false, error: normalizeError(listError) }
    }

    const listRow = listData?.[0]
    if (!listRow || !listRow.can_display) {
      return { ok: false, error: 'invalid_input' }
    }

    const { data, error } = await supabaseClient
      .from('user_list')
      .select('list_id')
      .eq('user_id', userResult.userId)
      .eq('list_id', trimmedListId)
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
        .eq('list_id', trimmedListId)

      if (deleteError) {
        return { ok: false, error: normalizeError(deleteError) }
      }

      return { ok: true, data: { isFavorited: false } }
    }

    const { error: insertError } = await supabaseClient
      .from('user_list')
      .insert({ user_id: userResult.userId, list_id: trimmedListId })

    if (insertError) {
      return { ok: false, error: normalizeError(insertError) }
    }

    return { ok: true, data: { isFavorited: true } }
  },
})
