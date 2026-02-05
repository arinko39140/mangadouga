import { normalizeSortOrder } from './sortOrderPolicy.js'
import { resolveCurrentUserId } from './supabaseSession.js'

export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DEFAULT_WEEKDAY_LIMIT = 100

const buildEmptyWeekdayLists = () =>
  WEEKDAY_KEYS.map((weekday) => ({
    weekday,
    items: [],
  }))

const mapRowToItem = (row, isOshi = false) => ({
  id: row.movie_id,
  title: row.movie_title,
  popularityScore: row.favorite_count,
  thumbnailUrl: row.thumbnail_url ?? null,
  detailPath: row.url ?? '',
  publishedAt: row.update,
  weekday: row.weekday,
  seriesId: row.series_id ?? null,
  isOshi: Boolean(isOshi),
})

const resolveTimestamp = (item) => {
  const time = Date.parse(item?.publishedAt ?? '')
  return Number.isFinite(time) ? time : 0
}

const resolvePopularity = (item) =>
  Number.isFinite(item?.popularityScore) ? item.popularityScore : 0

const sortItemsByPopularity = (items, direction = 'desc') => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const popularityDiff = resolvePopularity(b) - resolvePopularity(a)
    if (popularityDiff !== 0) {
      return direction === 'asc' ? -popularityDiff : popularityDiff
    }
    return resolveTimestamp(b) - resolveTimestamp(a)
  })
  return sorted
}

const normalizeWeekdayLists = (rows, oshiSet = new Set()) => {
  const lists = buildEmptyWeekdayLists()
  const indexByWeekday = new Map(lists.map((list) => [list.weekday, list]))

  rows.forEach((row) => {
    const list = indexByWeekday.get(row.weekday)
    if (!list) return
    list.items.push(mapRowToItem(row, oshiSet.has(row.movie_id)))
  })

  return lists
}

const WEEK_RANGE_MS = 7 * 24 * 60 * 60 * 1000

const buildWeekThresholdDate = () =>
  new Date(Date.now() - WEEK_RANGE_MS)

const isWithinWeekRange = (value, thresholdMs) => {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return false
  return time >= thresholdMs
}

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

export const createWeekdayDataProvider = (supabaseClient) => ({
  async fetchAllItems({ select = 'minimal' } = {}) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const fields =
      select === 'full'
        ? '*'
        : 'movie_id, movie_title, url, thumbnail_url, favorite_count, update, series_id, weekday'

    const { data, error } = await supabaseClient
      .from('movie')
      .select(fields)
      .not('update', 'is', null)
      .order('update', { ascending: false })

    if (error) {
      return {
        ok: false,
        error: isNetworkError(error) ? 'network' : 'unknown',
      }
    }

    const rows = (data ?? []).filter((row) => row.update != null)
    const movieIds = rows.map((row) => row.movie_id).filter(Boolean)
    let oshiSet = new Set()

    if (movieIds.length > 0) {
      const userResult = await resolveCurrentUserId(supabaseClient)
      if (userResult.ok) {
        const { data: listRows, error: listError } = await supabaseClient
          .from('list')
          .select('list_id')
          .eq('user_id', userResult.userId)
          .order('list_id', { ascending: true })
          .limit(1)
        const listId = listError ? null : listRows?.[0]?.list_id ?? null

        if (listId) {
          const { data: listMovieRows, error: listMovieError } = await supabaseClient
            .from('list_movie')
            .select('movie_id')
            .eq('list_id', listId)
            .in('movie_id', movieIds)

          if (!listMovieError) {
            oshiSet = new Set((listMovieRows ?? []).map((row) => row.movie_id))
          }
        }
      }
    }

    return {
      ok: true,
      data: rows.map((row) => mapRowToItem(row, oshiSet.has(row.movie_id))),
    }
  },
  async fetchWeekdayItems({ weekday, sortOrder, limit } = {}) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const resolvedWeekday = WEEKDAY_KEYS.includes(weekday) ? weekday : 'all'
    const resolvedSortOrder = normalizeSortOrder(sortOrder)
    const resolvedLimit =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_WEEKDAY_LIMIT

    let query = supabaseClient
      .from('movie')
      .select(
        'movie_id, movie_title, url, thumbnail_url, favorite_count, update, series_id, weekday'
      )
      .not('update', 'is', null)

    if (resolvedWeekday !== 'all') {
      query = query.eq('weekday', resolvedWeekday)
    }

    const { data, error } = await query
      .order('update', { ascending: false })
      .range(0, resolvedLimit - 1)

    if (error) {
      return {
        ok: false,
        error: isNetworkError(error) ? 'network' : 'unknown',
      }
    }

    const fetchedRows = (data ?? []).filter((row) => row.update != null)
    const movieIds = fetchedRows.map((row) => row.movie_id).filter(Boolean)
    let oshiSet = new Set()

    if (movieIds.length > 0) {
      const userResult = await resolveCurrentUserId(supabaseClient)
      if (userResult.ok) {
        const { data: listRows, error: listError } = await supabaseClient
          .from('list')
          .select('list_id')
          .eq('user_id', userResult.userId)
          .order('list_id', { ascending: true })
          .limit(1)
        const listId = listError ? null : listRows?.[0]?.list_id ?? null

        if (listId) {
          const { data: listMovieRows, error: listMovieError } = await supabaseClient
            .from('list_movie')
            .select('movie_id')
            .eq('list_id', listId)
            .in('movie_id', movieIds)

          if (!listMovieError) {
            oshiSet = new Set((listMovieRows ?? []).map((row) => row.movie_id))
          }
        }
      }
    }

    const fetchedItems = fetchedRows.map((row) => mapRowToItem(row, oshiSet.has(row.movie_id)))
    const items = (() => {
      if (resolvedSortOrder === 'favorite_asc') {
        return sortItemsByPopularity(fetchedItems, 'asc')
      }
      if (resolvedSortOrder === 'oldest') {
        return [...fetchedItems].sort((a, b) => resolveTimestamp(a) - resolveTimestamp(b))
      }
      if (resolvedSortOrder === 'latest') {
        return [...fetchedItems].sort((a, b) => resolveTimestamp(b) - resolveTimestamp(a))
      }
      return sortItemsByPopularity(fetchedItems)
    })()

    return {
      ok: true,
      data: {
        weekday: resolvedWeekday,
        items,
      },
    }
  },

  async fetchWeekdayLists() {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const thresholdDate = buildWeekThresholdDate()
    const thresholdIso = thresholdDate.toISOString()
    const thresholdMs = thresholdDate.getTime()
    const { data, error } = await supabaseClient
      .from('movie')
      .select(
        'movie_id, movie_title, url, thumbnail_url, favorite_count, update, series_id, weekday'
      )
      .gte('update', thresholdIso)
      .order('favorite_count', { ascending: false })

    if (error) {
      return {
        ok: false,
        error: isNetworkError(error) ? 'network' : 'unknown',
      }
    }

    const filteredRows = (data ?? []).filter((row) =>
      isWithinWeekRange(row.update, thresholdMs)
    )
    const movieIds = filteredRows.map((row) => row.movie_id).filter(Boolean)
    let oshiSet = new Set()

    if (movieIds.length > 0) {
      const userResult = await resolveCurrentUserId(supabaseClient)
      if (userResult.ok) {
        const { data: listRows, error: listError } = await supabaseClient
          .from('list')
          .select('list_id')
          .eq('user_id', userResult.userId)
          .order('list_id', { ascending: true })
          .limit(1)
        const listId = listError ? null : listRows?.[0]?.list_id ?? null

        if (listId) {
          const { data: listMovieRows, error: listMovieError } = await supabaseClient
            .from('list_movie')
            .select('movie_id')
            .eq('list_id', listId)
            .in('movie_id', movieIds)

          if (!listMovieError) {
            oshiSet = new Set((listMovieRows ?? []).map((row) => row.movie_id))
          }
        }
      }
    }

    return {
      ok: true,
      data: normalizeWeekdayLists(filteredRows, oshiSet),
    }
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

    const { data: listRows, error: listError } = await supabaseClient
      .from('list')
      .select('list_id')
      .eq('user_id', userResult.userId)
      .order('list_id', { ascending: true })
      .limit(1)

    if (listError) {
      return { ok: false, error: normalizeError(listError) }
    }

    const listId = listRows?.[0]?.list_id ?? null
    if (!listId) {
      return { ok: false, error: 'not_configured' }
    }

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
  },
})
