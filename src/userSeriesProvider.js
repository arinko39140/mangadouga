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

const isMissingColumnError = (error, columnName) => {
  if (!error || !columnName) return false
  const message = String(error.message ?? '')
  return message.includes(columnName) && message.includes('does not exist')
}

const hasRequiredSeriesFields = (series) => Boolean(series?.series_id && series?.title)

const mapSeriesRow = (series) => ({
  seriesId: series.series_id,
  title: series.title,
  favoriteCount: series.favorite_count ?? null,
  updatedAt: series.update ?? null,
})

const mapSeriesRowWithThumbnail = (series, thumbnailUrl) => ({
  seriesId: series.series_id,
  title: series.title,
  favoriteCount: series.favorite_count ?? null,
  updatedAt: series.update ?? null,
  thumbnailUrl: thumbnailUrl ?? null,
})

const buildThumbnailMap = (rows) => {
  const map = new Map()
  const updatedAtMap = new Map()
  ;(rows ?? []).forEach((row) => {
    const seriesId = row?.series_id != null ? String(row.series_id) : ''
    if (!seriesId) return
    const updatedAt = row?.update ?? null
    const currentUpdatedAt = updatedAtMap.get(seriesId)
    const shouldReplace =
      currentUpdatedAt == null ||
      (updatedAt != null &&
        new Date(updatedAt).getTime() > new Date(currentUpdatedAt).getTime())
    if (!shouldReplace) return
    updatedAtMap.set(seriesId, updatedAt)
    map.set(seriesId, row?.thumbnail_url ?? null)
  })
  return map
}

const fetchLatestThumbnails = async (supabaseClient, seriesIds) => {
  if (!supabaseClient || typeof supabaseClient.from !== 'function') {
    return { ok: false, error: 'not_configured' }
  }
  if (!Array.isArray(seriesIds) || seriesIds.length === 0) {
    return { ok: true, data: new Map() }
  }

  const { data, error } = await supabaseClient
    .from('movie')
    .select('series_id, thumbnail_url, update')
    .in('series_id', seriesIds)
    .order('update', { ascending: false })

  if (error) {
    return { ok: false, error: normalizeError(error) }
  }

  return { ok: true, data: buildThumbnailMap(data) }
}

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

  async fetchSeriesSummary(input) {
    const targetUserId =
      typeof input === 'object' && input !== null ? input.targetUserId : null
    const viewerUserId =
      typeof input === 'object' && input !== null ? input.viewerUserId ?? null : null
    const limit =
      typeof input === 'object' && input !== null ? Number(input.limit ?? 0) : 0
    if (typeof targetUserId !== 'string' || targetUserId.trim() === '' || limit < 1) {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const isOwner =
      typeof viewerUserId === 'string' && viewerUserId.trim() === targetUserId

    let query = supabaseClient
      .from('user_series')
      .select('series:series_id (series_id, title, favorite_count, update), created_at')
      .eq('user_id', targetUserId)

    if (!isOwner) {
      query = query.eq('can_display', true)
    }

    let { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

    if (error && isMissingColumnError(error, 'created_at')) {
      const fallbackQuery = supabaseClient
        .from('user_series')
        .select('series:series_id (series_id, title, favorite_count, update)')
        .eq('user_id', targetUserId)
        .limit(limit)
      if (!isOwner) {
        fallbackQuery.eq('can_display', true)
      }
      const fallbackResult = await fallbackQuery
      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const seriesItems = (data ?? [])
      .map((row) => row?.series ?? null)
      .filter(hasRequiredSeriesFields)
      .map(mapSeriesRow)

    if (seriesItems.length === 0) {
      return { ok: true, data: { items: [] } }
    }

    const thumbnailResult = await fetchLatestThumbnails(
      supabaseClient,
      seriesItems.map((item) => item.seriesId)
    )

    if (!thumbnailResult.ok) {
      return { ok: false, error: thumbnailResult.error }
    }

    const thumbnailMap = thumbnailResult.data
    return {
      ok: true,
      data: {
        items: seriesItems.map((item) =>
          mapSeriesRowWithThumbnail(
            {
              series_id: item.seriesId,
              title: item.title,
              favorite_count: item.favoriteCount,
              update: item.updatedAt,
            },
            thumbnailMap.get(item.seriesId)
          )
        ),
      },
    }
  },

  async fetchSeriesList(input) {
    const targetUserId =
      typeof input === 'object' && input !== null ? input.targetUserId : null
    const viewerUserId =
      typeof input === 'object' && input !== null ? input.viewerUserId ?? null : null
    const sort = typeof input === 'object' && input !== null ? input.sort ?? null : null
    if (typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const isOwner =
      typeof viewerUserId === 'string' && viewerUserId.trim() === targetUserId

    let query = supabaseClient
      .from('user_series')
      .select('series:series_id (series_id, title, favorite_count, update)')
      .eq('user_id', targetUserId)

    if (!isOwner) {
      query = query.eq('can_display', true)
    }

    if (sort?.key === 'favorite_count' && (sort.order === 'asc' || sort.order === 'desc')) {
      query = query.order('favorite_count', {
        ascending: sort.order === 'asc',
        referencedTable: 'series',
      })
    }

    const { data, error } = await query

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const seriesItems = (data ?? [])
      .map((row) => row?.series ?? null)
      .filter(hasRequiredSeriesFields)
      .map(mapSeriesRow)

    if (seriesItems.length === 0) {
      return { ok: true, data: [] }
    }

    const thumbnailResult = await fetchLatestThumbnails(
      supabaseClient,
      seriesItems.map((item) => item.seriesId)
    )

    if (!thumbnailResult.ok) {
      return { ok: false, error: thumbnailResult.error }
    }

    const thumbnailMap = thumbnailResult.data
    return {
      ok: true,
      data: seriesItems.map((item) =>
        mapSeriesRowWithThumbnail(
          {
            series_id: item.seriesId,
            title: item.title,
            favorite_count: item.favoriteCount,
            update: item.updatedAt,
          },
          thumbnailMap.get(item.seriesId)
        )
      ),
    }
  },

  async registerSeries(input) {
    const seriesId =
      typeof input === 'object' && input !== null ? String(input.seriesId ?? '') : ''
    if (!seriesId.trim()) {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }

    const { error } = await supabaseClient
      .from('user_series')
      .insert({ user_id: userResult.userId, series_id: seriesId.trim() })

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, data: null }
  },

  async unregisterSeries(input) {
    const seriesId =
      typeof input === 'object' && input !== null ? String(input.seriesId ?? '') : ''
    if (!seriesId.trim()) {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }

    const { error } = await supabaseClient
      .from('user_series')
      .delete()
      .eq('user_id', userResult.userId)
      .eq('series_id', seriesId.trim())

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, data: null }
  },
})
