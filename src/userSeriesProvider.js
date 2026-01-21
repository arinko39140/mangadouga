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

const hasRequiredSeriesFields = (series) => Boolean(series?.series_id && series?.title)

const mapSeriesRow = (series) => ({
  seriesId: series.series_id,
  title: series.title,
  favoriteCount: series.favorite_count ?? null,
  updatedAt: series.update ?? null,
})

export const createUserSeriesProvider = (supabaseClient) => ({
  async fetchSeries(userId) {
    if (typeof userId !== 'string' || userId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('user_series')
      .select('series:series_id (series_id, title, favorite_count, update)')
      .eq('user_id', userId)
      .eq('can_display', true)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const seriesItems = (data ?? [])
      .map((row) => row?.series ?? null)
      .filter(hasRequiredSeriesFields)
      .map(mapSeriesRow)

    return { ok: true, data: seriesItems }
  },
})
