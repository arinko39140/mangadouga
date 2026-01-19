const hasRequiredMovieFields = (movie) =>
  Boolean(movie && movie.movie_id && movie.movie_title)

const isNetworkError = (error) => {
  if (!error) return false
  const message = String(error.message ?? '')
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

const normalizeError = (error) => (isNetworkError(error) ? 'network' : 'unknown')

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

export const createOshiListDataProvider = (supabaseClient) => ({
  async fetchOshiList() {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('movie_oshi')
      .select(
        'movie:movie_id (movie_id, movie_title, url, thumbnail_url, update, series_id)'
      )

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, data: normalizeOshiRows(data) }
  },
})
