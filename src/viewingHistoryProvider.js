const normalizeLimit = (limit) => {
  const parsed = Number(limit)
  if (!Number.isFinite(parsed)) return 30
  if (parsed < 1) return 1
  if (parsed > 30) return 30
  return Math.floor(parsed)
}

const mapMovieRow = (movie) => ({
  movieId: movie.movie_id,
  seriesId: movie.series_id ?? null,
  title: movie.movie_title,
  thumbnailUrl: movie.thumbnail_url ?? null,
  favoriteCount: Number.isFinite(movie.favorite_count) ? movie.favorite_count : 0,
})

const buildMovieMap = (rows) => {
  const map = new Map()
  ;(rows ?? []).forEach((row) => {
    if (!row?.movie_id || !row?.movie_title) return
    map.set(row.movie_id, mapMovieRow(row))
  })
  return map
}

const buildOshiSet = (rows) => {
  const set = new Set()
  ;(rows ?? []).forEach((row) => {
    if (row?.movie_id) set.add(row.movie_id)
  })
  return set
}

export const createViewingHistoryProvider = (supabaseClient) => {
  return {
    async fetchHistory(input = {}) {
      if (!supabaseClient?.from || !supabaseClient?.auth?.getSession) {
        return { ok: false, error: 'not_configured' }
      }

      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession()
      const userId = sessionData?.session?.user?.id ?? null
      if (sessionError || !userId) {
        return { ok: false, error: 'auth_required' }
      }

      const limit = normalizeLimit(input?.limit)

      const { data: historyRows, error: historyError } = await supabaseClient
        .from('history')
        .select('history_id, movie_id, clicked_at')
        .eq('user_id', userId)
        .order('clicked_at', { ascending: false })
        .limit(limit)

      if (historyError) {
        return { ok: false, error: 'unknown' }
      }

      const movieIds = (historyRows ?? [])
        .map((row) => row?.movie_id)
        .filter(Boolean)

      if (movieIds.length === 0) {
        return { ok: true, data: [] }
      }

      const { data: movieRows, error: movieError } = await supabaseClient
        .from('movie')
        .select('movie_id, series_id, movie_title, thumbnail_url, favorite_count')
        .in('movie_id', movieIds)

      if (movieError) {
        return { ok: false, error: 'unknown' }
      }

      const { data: listRows, error: listError } = await supabaseClient
        .from('list')
        .select('list_id')
        .eq('user_id', userId)
        .order('list_id', { ascending: true })
        .limit(1)

      if (listError) {
        return { ok: false, error: 'unknown' }
      }

      const listId = listRows?.[0]?.list_id ?? null
      let listMovieRows = []

      if (listId) {
        const { data, error } = await supabaseClient
          .from('list_movie')
          .select('list_id, movie_id')
          .eq('list_id', listId)
          .in('movie_id', movieIds)

        if (error) {
          return { ok: false, error: 'unknown' }
        }
        listMovieRows = data ?? []
      }

      const movieMap = buildMovieMap(movieRows)
      const oshiSet = buildOshiSet(listMovieRows)

      const normalized = (historyRows ?? [])
        .map((row) => {
          const movie = movieMap.get(row.movie_id)
          if (!movie) return null
          return {
            historyId: row.history_id,
            movieId: row.movie_id,
            seriesId: movie.seriesId,
            title: movie.title,
            thumbnailUrl: movie.thumbnailUrl,
            clickedAt: row.clicked_at,
            favoriteCount: movie.favoriteCount,
            isOshi: oshiSet.has(row.movie_id),
          }
        })
        .filter(Boolean)

      return { ok: true, data: normalized }
    },
  }
}
