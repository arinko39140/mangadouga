import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import EpisodeListPanel from './EpisodeListPanel.jsx'
import FavoriteStarButton from './FavoriteStarButton.jsx'
import PlaybackPanel from './PlaybackPanel.jsx'
import SeriesHeader from './SeriesHeader.jsx'
import SortControl from './SortControl.jsx'
import { createMockWorkPageDataProvider } from './mockWorkPageDataProvider.js'
import { publishOshiListUpdated } from './oshiListEvents.js'
import { publishUserSeriesUpdated } from './userSeriesEvents.js'
import {
  DEFAULT_SORT_ORDER,
  SORT_ORDER_QUERY_KEY,
  normalizeSortOrder,
} from './sortOrderPolicy.js'
import { supabase } from './supabaseClient.js'
import { createWorkPageDataProvider } from './workPageDataProvider.js'
import './WorkPage.css'

const defaultDataProvider = supabase
  ? createWorkPageDataProvider(supabase)
  : createMockWorkPageDataProvider()

const formatSortLabel = (sortOrder) => {
  if (sortOrder === 'latest') return '投稿日'
  return '人気'
}

function WorkPage({ dataProvider = defaultDataProvider, authGate }) {
  const { seriesId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [series, setSeries] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [selectedMovieId, setSelectedMovieId] = useState(() => {
    return searchParams.get('selectedMovieId')
  })
  const [sortOrder, setSortOrder] = useState(() => {
    return normalizeSortOrder(searchParams.get(SORT_ORDER_QUERY_KEY))
  })
  const [favoriteUpdating, setFavoriteUpdating] = useState(false)
  const [loading, setLoading] = useState({ series: false, episodes: false })
  const [error, setError] = useState({ series: null, episodes: null })
  const [oshiError, setOshiError] = useState(null)

  const selectedMovie = useMemo(
    () => episodes.find((episode) => episode.id === selectedMovieId) ?? null,
    [episodes, selectedMovieId]
  )

  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({
      supabaseClient: supabase,
      navigate,
      getRedirectContext: () => ({
        seriesId,
        selectedMovieId,
        sortOrder,
      }),
    })
  }, [authGate, navigate, seriesId, selectedMovieId, sortOrder])

  const handleFavoriteToggle = async () => {
    if (!seriesId || typeof dataProvider.toggleSeriesFavorite !== 'function') return

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('favorite')
      return
    }

    setFavoriteUpdating(true)
    try {
      const result = await dataProvider.toggleSeriesFavorite(seriesId)
      if (result.ok) {
        setSeries((prev) =>
          prev ? { ...prev, isFavorited: result.data.isFavorited } : prev
        )
        publishUserSeriesUpdated()
      }
    } finally {
      setFavoriteUpdating(false)
    }
  }

  const handleOshiToggle = async (movieId) => {
    if (!seriesId || typeof dataProvider.toggleMovieOshi !== 'function') return
    setOshiError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('oshi')
      return
    }

    const result = await dataProvider.toggleMovieOshi(movieId)
    if (result.ok) {
      setEpisodes((prev) =>
        prev.map((episode) =>
          episode.id === movieId
            ? { ...episode, isOshi: result.data.isOshi }
            : episode
        )
      )
      publishOshiListUpdated()
    } else {
      setOshiError('failed')
    }
  }

  useEffect(() => {
    const requestedSortOrder = searchParams.get(SORT_ORDER_QUERY_KEY)
    const requestedMovieId = searchParams.get('selectedMovieId')

    setSortOrder(normalizeSortOrder(requestedSortOrder))

    if (requestedMovieId) {
      setSelectedMovieId(requestedMovieId)
    }
  }, [searchParams])

  useEffect(() => {
    const currentSortOrder = searchParams.get(SORT_ORDER_QUERY_KEY)
    const nextSortOrder = sortOrder ?? DEFAULT_SORT_ORDER

    if (currentSortOrder === nextSortOrder) return

    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set(SORT_ORDER_QUERY_KEY, nextSortOrder)
      return nextParams
    }, { replace: true })
  }, [searchParams, setSearchParams, sortOrder])

  useEffect(() => {
    if (!seriesId) return
    let isMounted = true

    setLoading((prev) => ({ ...prev, series: true }))
    setError((prev) => ({ ...prev, series: null }))

    dataProvider
      .fetchSeriesOverview(seriesId)
      .then((result) => {
        if (!isMounted) return
        if (result.ok) {
          setSeries(result.data)
        } else {
          setError((prev) => ({ ...prev, series: result.error }))
        }
      })
      .finally(() => {
        if (!isMounted) return
        setLoading((prev) => ({ ...prev, series: false }))
      })

    return () => {
      isMounted = false
    }
  }, [dataProvider, seriesId])

  useEffect(() => {
    if (!seriesId) return
    let isMounted = true

    setLoading((prev) => ({ ...prev, episodes: true }))
    setError((prev) => ({ ...prev, episodes: null }))

    dataProvider
      .fetchMovies(seriesId, sortOrder)
      .then((result) => {
        if (!isMounted) return
        if (result.ok) {
          setEpisodes(result.data)
        } else {
          setError((prev) => ({ ...prev, episodes: result.error }))
          setEpisodes([])
        }
      })
      .finally(() => {
        if (!isMounted) return
        setLoading((prev) => ({ ...prev, episodes: false }))
      })

    return () => {
      isMounted = false
    }
  }, [dataProvider, seriesId, sortOrder])

  useEffect(() => {
    if (episodes.length === 0) {
      setSelectedMovieId(null)
      return
    }

    setSelectedMovieId((current) => {
      if (current && episodes.some((episode) => episode.id === current)) {
        return current
      }
      return episodes[0].id
    })
  }, [episodes])

  return (
    <main className="work-page">
      <header className="work-page__header">
        <h1>作品ページ</h1>
        <SeriesHeader
          title={series?.title}
          isLoading={loading.series}
          error={error.series}
        />
        <FavoriteStarButton
          isFavorited={series?.isFavorited ?? false}
          isLoading={favoriteUpdating}
          onToggle={handleFavoriteToggle}
        />
      </header>
      <section className="work-page__playback" aria-label="再生領域">
        <PlaybackPanel episode={selectedMovie} isLoading={loading.episodes} />
      </section>
      <section className="work-page__episodes" aria-label="話数一覧">
        <p className="work-page__sort">並び順: {formatSortLabel(sortOrder)}</p>
        <SortControl
          sortOrder={sortOrder}
          onChange={(nextSortOrder) =>
            setSortOrder(normalizeSortOrder(nextSortOrder))
          }
        />
        {oshiError ? (
          <p className="work-page__status work-page__status--error">
            推し登録に失敗しました。
          </p>
        ) : null}
        <EpisodeListPanel
          episodes={episodes}
          selectedMovieId={selectedMovieId}
          onSelectEpisode={setSelectedMovieId}
          onToggleOshi={handleOshiToggle}
          isLoading={loading.episodes}
          error={error.episodes}
        />
      </section>
    </main>
  )
}

export default WorkPage
