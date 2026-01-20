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

const mapListRow = (row) => ({
  listId: String(row.list_id),
  name: row.users?.name ?? '',
  favoriteCount: row.favorite_count ?? 0,
  isFavorited: false,
  visibility: mapVisibility(row.can_display),
})

const mapMovieRow = (movie) => ({
  id: movie.movie_id,
  title: movie.movie_title,
  thumbnailUrl: movie.thumbnail_url ?? null,
  publishedAt: movie.update ?? null,
  videoUrl: movie.url ?? null,
  seriesId: movie.series_id ?? null,
})

export const createOshiListPageProvider = (supabaseClient) => {
  const fetchFavoriteState = async (targetListId) => {
    const { data, error } = await supabaseClient
      .from('oshi_list_favorite')
      .select('target_list_id')
      .eq('target_list_id', targetListId)
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
        .select('list_id, favorite_count, can_display, users (name)')
        .eq('list_id', targetListId)
        .limit(1)

      if (listError) {
        return { ok: false, error: normalizeError(listError) }
      }

      const listRow = listData?.[0]
      if (!listRow) {
        return { ok: false, error: 'not_found' }
      }

      const favoriteState = await fetchFavoriteState(targetListId)
      if (!favoriteState.ok) {
        return { ok: false, error: favoriteState.error }
      }
      const summary = mapListRow(listRow)
      summary.isFavorited = favoriteState.isFavorited
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
        .map(mapMovieRow)

      return { ok: true, data: items }
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

    async fetchVisibility(targetListId) {
      if (typeof targetListId !== 'string' || targetListId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const { data, error } = await supabaseClient
        .from('list')
        .select('can_display')
        .eq('list_id', targetListId)
        .limit(1)

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      const row = data?.[0]
      if (!row) {
        return { ok: false, error: 'not_found' }
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
