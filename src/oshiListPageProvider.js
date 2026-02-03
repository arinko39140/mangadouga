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

const mapVisibility = (canDisplay) => (canDisplay ? 'public' : 'private')

const mapListRow = (row, name) => ({
  listId: String(row.list_id),
  userId: row.user_id ? String(row.user_id) : '',
  name: name ?? '',
  favoriteCount: row.favorite_count ?? 0,
  isFavorited: false,
  visibility: mapVisibility(row.can_display),
})

const mapMovieRow = (movie, isOshi = false) => ({
  id: movie.movie_id,
  title: movie.movie_title,
  thumbnailUrl: movie.thumbnail_url ?? null,
  publishedAt: movie.update ?? null,
  videoUrl: movie.url ?? null,
  seriesId: movie.series_id ?? null,
  isOshi,
})

export const createOshiListPageProvider = (supabaseClient) => {
  const fetchUserListId = async (userId) => {
    const { data, error } = await supabaseClient
      .from('list')
      .select('list_id')
      .eq('user_id', userId)
      .order('list_id', { ascending: true })
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, listId: data?.[0]?.list_id ?? null }
  }

  const toggleListMovie = async ({ listId, movieId }) => {
    const { data, error } = await supabaseClient
      .from('list_movie')
      .select('list_id, movie_id')
      .eq('list_id', listId)
      .eq('movie_id', movieId)
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const exists = (data ?? []).length > 0

    if (exists) {
      const { error: deleteError } = await supabaseClient
        .from('list_movie')
        .delete()
        .eq('list_id', listId)
        .eq('movie_id', movieId)

      if (deleteError) {
        return { ok: false, error: normalizeError(deleteError) }
      }

      return { ok: true, data: { isOshi: false } }
    }

    const { error: insertError } = await supabaseClient
      .from('list_movie')
      .insert({ list_id: listId, movie_id: movieId })

    if (insertError) {
      return { ok: false, error: normalizeError(insertError) }
    }

    return { ok: true, data: { isOshi: true } }
  }

  const fetchFavoriteState = async (targetListId, userId) => {
    const { data, error } = await supabaseClient
      .from('user_list')
      .select('list_id')
      .eq('user_id', userId)
      .eq('list_id', targetListId)
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, isFavorited: (data ?? []).length > 0 }
  }

  return {
    async fetchListSummary(targetListId) {
      if (typeof targetListId !== 'string' || targetListId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const { data: listData, error: listError } = await supabaseClient
        .from('list')
        .select('list_id, favorite_count, can_display, user_id')
        .eq('list_id', targetListId)
        .limit(1)

      if (listError) {
        return { ok: false, error: normalizeError(listError) }
      }

      const listRow = listData?.[0]
      if (!listRow) {
        return { ok: false, error: 'not_found' }
      }

      let listOwnerName = ''
      if (listRow.user_id) {
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('name')
          .eq('user_id', String(listRow.user_id))
          .limit(1)

        if (userError) {
          return { ok: false, error: normalizeError(userError) }
        }

        listOwnerName = userData?.[0]?.name ?? ''
      }

      const summary = mapListRow(listRow, listOwnerName)

      const userResult = await resolveCurrentUserId(supabaseClient)
      if (!userResult.ok) {
        return { ok: false, error: userResult.error }
      }

      const isOwner = String(listRow.user_id ?? '') === userResult.userId
      summary.isOwner = isOwner
      if (!isOwner) {
        const favoriteState = await fetchFavoriteState(targetListId, userResult.userId)
        if (!favoriteState.ok) {
          return { ok: false, error: favoriteState.error }
        }
        summary.isFavorited = favoriteState.isFavorited
      } else {
        summary.isFavorited = false
      }
      return { ok: true, data: summary }
    },

    async fetchListItems(targetListId) {
      if (typeof targetListId !== 'string' || targetListId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const { data, error } = await supabaseClient
        .from('list_movie')
        .select(
          'movie:movie_id (movie_id, movie_title, url, thumbnail_url, update, series_id)'
        )
        .eq('list_id', targetListId)

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      const items = (data ?? [])
        .map((row) => row.movie)
        .filter((movie) => movie?.movie_id && movie?.movie_title)
      if (items.length === 0) {
        return { ok: true, data: [] }
      }

      const userResult = await resolveCurrentUserId(supabaseClient)
      if (!userResult.ok) {
        return { ok: true, data: items.map((item) => mapMovieRow(item, false)) }
      }

      const listResult = await fetchUserListId(userResult.userId)
      if (!listResult.ok) {
        return { ok: true, data: items.map((item) => mapMovieRow(item, false)) }
      }

      const userListId = listResult.listId ?? null
      if (!userListId) {
        return { ok: true, data: items.map((item) => mapMovieRow(item, false)) }
      }

      const movieIds = items.map((item) => item.movie_id)
      const { data: oshiRows, error: oshiError } = await supabaseClient
        .from('list_movie')
        .select('movie_id')
        .eq('list_id', userListId)
        .in('movie_id', movieIds)

      if (oshiError) {
        return { ok: true, data: items.map((item) => mapMovieRow(item, false)) }
      }

      const oshiSet = new Set((oshiRows ?? []).map((row) => row.movie_id))
      const enrichedItems = items.map((item) => mapMovieRow(item, oshiSet.has(item.movie_id)))

      return { ok: true, data: enrichedItems }
    },

    async toggleMovieOshi(movieId) {
      if (typeof movieId !== 'string' || movieId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const userResult = await resolveCurrentUserId(supabaseClient)
      if (!userResult.ok) {
        return { ok: false, error: userResult.error }
      }

      const listResult = await fetchUserListId(userResult.userId)
      if (!listResult.ok || !listResult.listId) {
        return { ok: false, error: listResult.error ?? 'not_found' }
      }

      return toggleListMovie({ listId: listResult.listId, movieId })
    },

    async toggleFavorite(targetListId) {
      if (typeof targetListId !== 'string' || targetListId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
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

    async fetchVisibility(targetListId) {
      if (typeof targetListId !== 'string' || targetListId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const userResult = await resolveCurrentUserId(supabaseClient)
      if (!userResult.ok) {
        return { ok: false, error: userResult.error }
      }

      const { data, error } = await supabaseClient
        .from('list')
        .select('user_id, can_display')
        .eq('list_id', targetListId)
        .limit(1)

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      const row = data?.[0]
      if (!row) {
        return { ok: false, error: 'not_found' }
      }

      if (row.user_id !== userResult.userId) {
        return { ok: false, error: 'forbidden' }
      }

      return { ok: true, data: { visibility: mapVisibility(row.can_display) } }
    },

    async updateVisibility(targetListId, visibility) {
      if (typeof targetListId !== 'string' || targetListId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (visibility !== 'public' && visibility !== 'private') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const canDisplay = visibility === 'public'
      const { data, error } = await supabaseClient
        .from('list')
        .update({ can_display: canDisplay })
        .eq('list_id', targetListId)
        .select('can_display')

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      const row = data?.[0]
      if (!row) {
        return { ok: false, error: 'not_found' }
      }

      return { ok: true, data: { visibility: mapVisibility(row.can_display) } }
    },
  }
}
