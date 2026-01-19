const hasRequiredMovieFields = (movie) =>
  Boolean(movie && movie.movie_id && movie.movie_title)

const isNetworkError = (error) => {
  if (!error) return false
  const message = String(error.message ?? '')
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

const normalizeError = (error) => (isNetworkError(error) ? 'network' : 'unknown')

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

const normalizeOshiRows = (rows) =>
  (rows ?? [])
    .map((row) => row.movie)
    .filter(hasRequiredMovieFields)
    .map(mapMovieRow)

export const createOshiListDataProvider = (supabaseClient) => {
  let cachedListId = null

  const fetchListId = async () => {
    if (cachedListId !== null) return { ok: true, listId: cachedListId }

    const { data, error } = await supabaseClient
      .from('list')
      .select('list_id')
      .order('list_id', { ascending: true })
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const listId = data?.[0]?.list_id ?? null
    cachedListId = listId
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
  }
}
