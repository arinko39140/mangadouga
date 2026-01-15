import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

const defaultDataProvider = {
  fetchSeriesOverview: async () => ({ ok: false, error: 'not_configured' }),
  fetchEpisodes: async () => ({ ok: false, error: 'not_configured' }),
}

const formatSortLabel = (sortOrder) => (sortOrder === 'latest' ? '最新話' : '古い順')
const parseSortOrder = (value) => (value === 'oldest' ? 'oldest' : 'latest')

function WorkPage({ dataProvider = defaultDataProvider }) {
  const { seriesId } = useParams()
  const location = useLocation()
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
  const [loading, setLoading] = useState({ series: false, episodes: false })
  const [error, setError] = useState({ series: null, episodes: null })

  const selectedEpisode = useMemo(
    () => episodes.find((episode) => episode.id === selectedEpisodeId) ?? null,
    [episodes, selectedEpisodeId]
  )

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
        {loading.series ? (
          <p className="work-page__status">作品情報を読み込み中...</p>
        ) : error.series ? (
          <p className="work-page__status work-page__status--error">作品情報の取得に失敗しました。</p>
        ) : (
          <p className="work-page__title">{series?.title ?? '作品が見つかりません。'}</p>
        )}
      </header>
      <section className="work-page__playback" aria-label="再生領域">
        {loading.episodes ? (
          <p className="work-page__status">再生準備中...</p>
        ) : selectedEpisode ? (
          <p className="work-page__playback-title">再生中: {selectedEpisode.title}</p>
        ) : (
          <p className="work-page__status">話数が選択されていません。</p>
        )}
      </section>
      <section className="work-page__episodes" aria-label="話数一覧">
        <p className="work-page__sort">並び順: {formatSortLabel(sortOrder)}</p>
        <p className="work-page__count">全{episodes.length}話</p>
        {loading.episodes ? (
          <p className="work-page__status">話数を読み込み中...</p>
        ) : error.episodes ? (
          <p className="work-page__status work-page__status--error">話数の取得に失敗しました。</p>
        ) : episodes.length === 0 ? (
          <p className="work-page__status">話数が存在しません。</p>
        ) : (
          <ul className="work-page__episode-list" aria-label="話数一覧のアイテム">
            {episodes.map((episode) => (
              <li key={episode.id} className="work-page__episode-item">
                <button
                  type="button"
                  className={
                    episode.id === selectedEpisodeId
                      ? 'work-page__episode-button is-selected'
                      : 'work-page__episode-button'
                  }
                  aria-pressed={episode.id === selectedEpisodeId}
                  onClick={() => setSelectedEpisodeId(episode.id)}
                >
                  {episode.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default WorkPage
