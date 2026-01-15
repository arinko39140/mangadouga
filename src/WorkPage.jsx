import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import EpisodeListPanel from './EpisodeListPanel.jsx'
import FavoriteStarButton from './FavoriteStarButton.jsx'
import PlaybackPanel from './PlaybackPanel.jsx'
import SeriesHeader from './SeriesHeader.jsx'
import SortControl from './SortControl.jsx'
import { createMockWorkPageDataProvider } from './mockWorkPageDataProvider.js'
import { supabase } from './supabaseClient.js'
import { createWorkPageDataProvider } from './workPageDataProvider.js'

const defaultDataProvider = supabase
  ? createWorkPageDataProvider(supabase)
  : createMockWorkPageDataProvider()

const formatSortLabel = (sortOrder) => (sortOrder === 'latest' ? '最新話' : '古い順')
const parseSortOrder = (value) => (value === 'oldest' ? 'oldest' : 'latest')

function WorkPage({ dataProvider = defaultDataProvider, authGate }) {
  const { seriesId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [series, setSeries] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(() => {
    const params = new URLSearchParams(location.search)
    return params.get('selectedEpisodeId')
  })
  const [sortOrder, setSortOrder] = useState(() => {
    const params = new URLSearchParams(location.search)
    return parseSortOrder(params.get('sortOrder'))
  })
  const [favoriteUpdating, setFavoriteUpdating] = useState(false)
  const [loading, setLoading] = useState({ series: false, episodes: false })
  const [error, setError] = useState({ series: null, episodes: null })

  const selectedEpisode = useMemo(
    () => episodes.find((episode) => episode.id === selectedEpisodeId) ?? null,
    [episodes, selectedEpisodeId]
  )

  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({
      supabaseClient: supabase,
      navigate,
      getRedirectContext: () => ({
        seriesId,
        selectedEpisodeId,
        sortOrder,
      }),
    })
  }, [authGate, navigate, seriesId, selectedEpisodeId, sortOrder])

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
      }
    } finally {
      setFavoriteUpdating(false)
    }
  }

  const handleOshiToggle = async (episodeId) => {
    if (!seriesId || typeof dataProvider.toggleEpisodeOshi !== 'function') return

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('oshi')
      return
    }

    const result = await dataProvider.toggleEpisodeOshi(episodeId)
    if (result.ok) {
      setEpisodes((prev) =>
        prev.map((episode) =>
          episode.id === episodeId
            ? { ...episode, isOshi: result.data.isOshi }
            : episode
        )
      )
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const requestedSortOrder = params.get('sortOrder')
    const requestedEpisodeId = params.get('selectedEpisodeId')

    if (requestedSortOrder) {
      setSortOrder(parseSortOrder(requestedSortOrder))
    }

    if (requestedEpisodeId) {
      setSelectedEpisodeId(requestedEpisodeId)
    }
  }, [location.search])

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
      .fetchEpisodes(seriesId, sortOrder)
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
      setSelectedEpisodeId(null)
      return
    }

    setSelectedEpisodeId((current) => {
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
        <PlaybackPanel episode={selectedEpisode} isLoading={loading.episodes} />
      </section>
      <section className="work-page__episodes" aria-label="話数一覧">
        <p className="work-page__sort">並び順: {formatSortLabel(sortOrder)}</p>
        <SortControl sortOrder={sortOrder} onChange={setSortOrder} />
        <EpisodeListPanel
          episodes={episodes}
          selectedEpisodeId={selectedEpisodeId}
          onSelectEpisode={setSelectedEpisodeId}
          onToggleOshi={handleOshiToggle}
          isLoading={loading.episodes}
          error={error.episodes}
        />
      </section>
    </main>
  )
}

export default WorkPage
