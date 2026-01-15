const isNetworkError = (error) => {
  if (!error) return false
  const message = String(error.message ?? '')
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

const normalizeError = (error) => (isNetworkError(error) ? 'network' : 'unknown')

const sortEpisodes = (episodes, sortOrder) => {
  const sorted = [...episodes]
  sorted.sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : null
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : null

    if (aTime === null && bTime === null) return 0
    if (aTime === null) return 1
    if (bTime === null) return -1

    return sortOrder === 'oldest' ? aTime - bTime : bTime - aTime
  })
  return sorted
}

const mapSeriesRow = (row) => ({
  id: row.series_id,
  title: row.title,
  favoriteCount: row.favorite_count ?? 0,
  isFavorited: false,
})

const mapEpisodeRow = (row) => ({
  id: row.movie_id,
  title: row.movie_title,
  thumbnailUrl: row.thumbnail_url ?? null,
  publishedAt: row.update ?? null,
  videoUrl: row.url ?? null,
  isOshi: false,
})

const toggleRecord = async ({
  client,
  table,
  idField,
  idValue,
  resultKey,
}) => {
  const { data, error } = await client
    .from(table)
    .select(idField)
    .eq(idField, idValue)
    .limit(1)

  if (error) {
    return { ok: false, error: normalizeError(error) }
  }

  const exists = (data ?? []).length > 0

  if (exists) {
    const { error: deleteError } = await client
      .from(table)
      .delete()
      .eq(idField, idValue)

    if (deleteError) {
      return { ok: false, error: normalizeError(deleteError) }
    }

    return { ok: true, data: { [resultKey]: false } }
  }

  const { error: insertError } = await client.from(table).insert({ [idField]: idValue })
  if (insertError) {
    return { ok: false, error: normalizeError(insertError) }
  }

  return { ok: true, data: { [resultKey]: true } }
}

export const createWorkPageDataProvider = (supabaseClient) => ({
  async fetchSeriesOverview(seriesId) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('series')
      .select('series_id, title, favorite_count')
      .eq('series_id', seriesId)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    if (!data || data.length === 0) {
      return { ok: false, error: 'not_found' }
    }

    return { ok: true, data: mapSeriesRow(data[0]) }
  },

  async fetchEpisodes(seriesId, sortOrder) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('movie')
      .select('movie_id, movie_title, url, thumbnail_url, update')
      .eq('series_id', seriesId)
      .order('update', { ascending: sortOrder === 'oldest' })

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const episodes = (data ?? []).map(mapEpisodeRow)
    return { ok: true, data: sortEpisodes(episodes, sortOrder) }
  },

  async toggleSeriesFavorite(seriesId) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    return toggleRecord({
      client: supabaseClient,
      table: 'series_favorite',
      idField: 'series_id',
      idValue: seriesId,
      resultKey: 'isFavorited',
    })
  },

  async toggleEpisodeOshi(episodeId) {
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    return toggleRecord({
      client: supabaseClient,
      table: 'episode_oshi',
      idField: 'movie_id',
      idValue: episodeId,
      resultKey: 'isOshi',
    })
  },
})
