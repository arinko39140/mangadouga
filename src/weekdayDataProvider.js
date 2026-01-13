export const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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

const buildWeekThreshold = () => {
  const sixDaysInMs = 6 * 24 * 60 * 60 * 1000
  return new Date(Date.now() - sixDaysInMs).toISOString()
}

export const createWeekdayDataProvider = (supabaseClient) => ({
  async fetchWeekdayLists() {
    const { data, error } = await supabaseClient
      .from('movie')
      .select(
        'movie_id, movie_title, url, favorite_count, update, series_id, weekday'
      )
      .gte('update', buildWeekThreshold())
      .order('favorite_count', { ascending: false })

    if (error) {
      throw error
    }

    return {
      ok: true,
      data: normalizeWeekdayLists(data ?? []),
    }
  },
})
