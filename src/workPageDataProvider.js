const isNetworkError = (error) => {
  if (!error) return false
  const message = String(error.message ?? '')
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

const normalizeError = (error) => {
  if (error?.code === '23505') return 'conflict'
  return isNetworkError(error) ? 'network' : 'unknown'
}

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

const mapEpisodeRow = (row, isOshi) => ({
  id: row.movie_id,
  title: row.movie_title,
  thumbnailUrl: row.thumbnail_url ?? null,
  publishedAt: row.update ?? null,
  videoUrl: row.url ?? null,
  isOshi: Boolean(isOshi),
})

const toggleRecord = async ({ client, table, idField, idValue, resultKey }) => {
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

export const createWorkPageDataProvider = (supabaseClient) => {
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

    async fetchMovies(seriesId, sortOrder) {
      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const listResult = await fetchListId()
      if (!listResult.ok) {
        return { ok: false, error: listResult.error }
      }

      const { data, error } = await supabaseClient
        .from('movie')
        .select('movie_id, movie_title, url, thumbnail_url, update')
        .eq('series_id', seriesId)
        .order('update', { ascending: sortOrder === 'oldest' })

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      const movieIds = (data ?? []).map((row) => row.movie_id).filter(Boolean)
      let oshiIds = new Set()

      if (listResult.listId && movieIds.length > 0) {
        const { data: listMovieRows, error: listMovieError } = await supabaseClient
          .from('list_movie')
          .select('movie_id')
          .eq('list_id', listResult.listId)
          .in('movie_id', movieIds)

        if (listMovieError) {
          return { ok: false, error: normalizeError(listMovieError) }
        }

        oshiIds = new Set((listMovieRows ?? []).map((row) => row.movie_id))
      }

      const episodes = (data ?? []).map((row) => mapEpisodeRow(row, oshiIds.has(row.movie_id)))
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
