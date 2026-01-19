const mockEpisodes = [
  {
    id: 'movie-3',
    title: '第3話',
    thumbnailUrl: '/vite.svg',
    publishedAt: '2026-02-01T12:00:00Z',
    videoUrl: '/videos/movie-3',
    isOshi: false,
  },
  {
    id: 'movie-2',
    title: '第2話',
    thumbnailUrl: null,
    publishedAt: '2026-01-15T12:00:00Z',
    videoUrl: '/videos/movie-2',
    isOshi: false,
  },
  {
    id: 'movie-1',
    title: '第1話',
    thumbnailUrl: '/vite.svg',
    publishedAt: null,
    videoUrl: '/videos/movie-1',
    isOshi: false,
  },
]

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

export const createMockWorkPageDataProvider = () => {
  let isFavorited = false
  const movieOshi = new Map()

  return {
    async fetchSeriesOverview(seriesId) {
      return {
        ok: true,
        data: {
          id: seriesId,
          title: 'サンプル作品',
          favoriteCount: 128,
          isFavorited,
        },
      }
    },

    async fetchMovies(_seriesId, sortOrder) {
      const episodes = sortEpisodes(mockEpisodes, sortOrder)
      return { ok: true, data: episodes }
    },

    async toggleSeriesFavorite() {
      isFavorited = !isFavorited
      return { ok: true, data: { isFavorited } }
    },

    async toggleMovieOshi(movieId) {
      const next = !(movieOshi.get(movieId) ?? false)
      movieOshi.set(movieId, next)
      return { ok: true, data: { isOshi: next } }
    },
  }
}
