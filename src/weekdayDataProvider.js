export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DEFAULT_WEEKDAY_LIMIT = 100

const buildEmptyWeekdayLists = () =>
  WEEKDAY_KEYS.map((weekday) => ({
    weekday,
    items: [],
  }))

const mapRowToItem = (row) => ({
  id: row.movie_id,
  title: row.movie_title,
  popularityScore: row.favorite_count,
  thumbnailUrl: null,
  detailPath: row.url ?? '',
  publishedAt: row.update,
  weekday: row.weekday,
  seriesId: row.series_id ?? null,
})

const resolveTimestamp = (item) => {
  const time = Date.parse(item?.publishedAt ?? '')
  return Number.isFinite(time) ? time : 0
}

const resolvePopularity = (item) =>
  Number.isFinite(item?.popularityScore) ? item.popularityScore : 0

const sortItemsByPopularity = (items) => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const popularityDiff = resolvePopularity(b) - resolvePopularity(a)
    if (popularityDiff !== 0) return popularityDiff
    return resolveTimestamp(b) - resolveTimestamp(a)
  })
  return sorted
}

const normalizeWeekdayLists = (rows) => {
  const lists = buildEmptyWeekdayLists()
  const indexByWeekday = new Map(lists.map((list) => [list.weekday, list]))

  rows.forEach((row) => {
    const list = indexByWeekday.get(row.weekday)
    if (!list) return
    list.items.push(mapRowToItem(row))
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

export const createWeekdayDataProvider = (supabaseClient) => ({
  async fetchWeekdayItems({ weekday, sortOrder, limit } = {}) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const resolvedWeekday = WEEKDAY_KEYS.includes(weekday) ? weekday : 'all'
    const resolvedSortOrder = sortOrder === 'latest' ? 'latest' : 'popular'
    const resolvedLimit =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_WEEKDAY_LIMIT

    let query = supabaseClient
      .from('movie')
      .select(
        'movie_id, movie_title, url, favorite_count, update, series_id, weekday'
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

    const fetchedItems = (data ?? [])
      .filter((row) => row.update != null)
      .map(mapRowToItem)
    const items =
      resolvedSortOrder === 'popular'
        ? sortItemsByPopularity(fetchedItems)
        : fetchedItems

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
        'movie_id, movie_title, url, favorite_count, update, series_id, weekday'
      )
      .gte('update', thresholdIso)
      .order('favorite_count', { ascending: false })

    if (error) {
      return {
        ok: false,
        error: isNetworkError(error) ? 'network' : 'unknown',
      }
    }

    return {
      ok: true,
      data: normalizeWeekdayLists(
        (data ?? []).filter((row) => isWithinWeekRange(row.update, thresholdMs))
      ),
    }
  },
})
