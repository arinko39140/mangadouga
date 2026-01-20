const hasRequiredMovieFields = (movie) =>
  Boolean(movie && movie.movie_id && movie.movie_title)

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

const toggleListMovie = async ({ client, listId, movieId }) => {
  const { data, error } = await client
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
    const { error: deleteError } = await client
      .from('list_movie')
      .delete()
      .eq('list_id', listId)
      .eq('movie_id', movieId)

    if (deleteError) {
      return { ok: false, error: normalizeError(deleteError) }
    }

    return { ok: true, data: { isOshi: false } }
  }

  const { error: insertError } = await client
    .from('list_movie')
    .insert({ list_id: listId, movie_id: movieId })
  if (insertError) {
    return { ok: false, error: normalizeError(insertError) }
  }

  return { ok: true, data: { isOshi: true } }
}

const mapMovieRow = (movie) => ({
  id: movie.movie_id,
  title: movie.movie_title,
  thumbnailUrl: movie.thumbnail_url ?? null,
  publishedAt: movie.update ?? null,
  videoUrl: movie.url ?? null,
  seriesId: movie.series_id ?? null,
  isOshi: true,
})

const mapVisibility = (canDisplay) => (canDisplay ? 'public' : 'private')

const normalizeOshiRows = (rows) =>
  (rows ?? [])
    .map((row) => row.movie)
    .filter(hasRequiredMovieFields)
    .map(mapMovieRow)

export const createOshiListDataProvider = (supabaseClient) => {
  let cachedListId = null
  let cachedUserId = null

  const fetchListId = async () => {
    if (!supabaseClient?.auth?.getSession) {
      return { ok: false, error: 'not_configured' }
    }

    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession()
    const userId = sessionData?.session?.user?.id ?? null
    if (sessionError || !userId) {
      return { ok: false, error: 'auth_required' }
    }

    if (cachedListId !== null && cachedUserId === userId) {
      return { ok: true, listId: cachedListId }
    }

    const { data, error } = await supabaseClient
      .from('list')
      .select('list_id')
      .eq('user_id', userId)
      .order('list_id', { ascending: true })
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const listId = data?.[0]?.list_id ?? null
    cachedListId = listId
    cachedUserId = userId
    return { ok: true, listId }
  }

  return {
    async fetchOshiList() {
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const listResult = await fetchListId()
      if (!listResult.ok) {
        return { ok: false, error: listResult.error }
      }
      if (!listResult.listId) {
        return { ok: true, data: [] }
      }

      const { data, error } = await supabaseClient
        .from('list_movie')
        .select(
          'movie:movie_id (movie_id, movie_title, url, thumbnail_url, update, series_id)'
        )
        .eq('list_id', listResult.listId)

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      return { ok: true, data: normalizeOshiRows(data) }
    },

    async toggleMovieOshi(movieId) {
      if (typeof movieId !== 'string' || movieId.trim() === '') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const listResult = await fetchListId()
      if (!listResult.ok || !listResult.listId) {
        return { ok: false, error: listResult.error ?? 'not_configured' }
      }

      return toggleListMovie({
        client: supabaseClient,
        listId: listResult.listId,
        movieId,
      })
    },

    async fetchVisibility() {
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const listResult = await fetchListId()
      if (!listResult.ok) {
        return { ok: false, error: listResult.error }
      }
      if (!listResult.listId) {
        return { ok: false, error: 'not_found' }
      }

      const { data, error } = await supabaseClient
        .from('list')
        .select('can_display')
        .eq('list_id', listResult.listId)
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

    async updateVisibility(visibility) {
      if (visibility !== 'public' && visibility !== 'private') {
        return { ok: false, error: 'invalid_input' }
      }
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const listResult = await fetchListId()
      if (!listResult.ok) {
        return { ok: false, error: listResult.error }
      }
      if (!listResult.listId) {
        return { ok: false, error: 'not_found' }
      }

      const canDisplay = visibility === 'public'
      const { data, error } = await supabaseClient
        .from('list')
        .update({ can_display: canDisplay })
        .eq('list_id', listResult.listId)
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
