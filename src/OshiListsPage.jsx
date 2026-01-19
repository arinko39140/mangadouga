import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createOshiListDataProvider } from './oshiListDataProvider.js'
import { subscribeOshiListUpdated } from './oshiListEvents.js'
import { supabase } from './supabaseClient.js'
import './OshiListsPage.css'

const defaultDataProvider = createOshiListDataProvider(supabase)

const buildYouTubeThumbnailUrl = (videoUrl) => {
  if (!videoUrl) return null

  let parsed
  try {
    parsed = new URL(videoUrl)
  } catch {
    return null
  }

  const hostname = parsed.hostname.replace(/^www\./, '')
  const pathname = parsed.pathname

  if (hostname === 'youtu.be') {
    const id = pathname.split('/').filter(Boolean)[0]
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
    }

    if (pathname.startsWith('/embed/')) {
      const id = pathname.split('/').filter(Boolean)[1]
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
    }

    if (pathname.startsWith('/shorts/')) {
      const id = pathname.split('/').filter(Boolean)[1]
      return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
    }
  }

  return null
}

function OshiListsPage({ dataProvider = defaultDataProvider, authGate }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [items, setItems] = useState([])
  const [viewMode, setViewMode] = useState('list')
  const [oshiError, setOshiError] = useState(null)
  const [oshiUpdatingIds, setOshiUpdatingIds] = useState([])
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      if (!dataProvider || typeof dataProvider.fetchOshiList !== 'function') {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setErrorType(null)
      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok) {
        setIsLoading(false)
        authGateInstance.redirectToLogin()
        return
      }
      const result = await dataProvider.fetchOshiList()
      if (!isMounted) return
      if (result.ok) {
        setItems(result.data)
      } else {
        setItems([])
        setErrorType(result.error?.type ?? 'unknown')
      }
      setIsLoading(false)
    }

    fetchIfAuthenticated()
    const handleOshiListUpdated = () => {
      fetchIfAuthenticated()
    }
    const unsubscribe = subscribeOshiListUpdated(handleOshiListUpdated)

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [authGateInstance, dataProvider])

  const handleOshiToggle = async (movieId) => {
    if (!dataProvider || typeof dataProvider.toggleMovieOshi !== 'function') return
    setOshiError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('oshi')
      return
    }

    setOshiUpdatingIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]))
    try {
      const result = await dataProvider.toggleMovieOshi(movieId)
      if (result.ok) {
        setItems((prev) => {
          if (!result.data.isOshi) {
            return prev.filter((item) => item.id !== movieId)
          }
          return prev.map((item) =>
            item.id === movieId ? { ...item, isOshi: result.data.isOshi } : item
          )
        })
      } else {
        setOshiError('failed')
      }
    } finally {
      setOshiUpdatingIds((prev) => prev.filter((id) => id !== movieId))
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <p>読み込み中です。</p>
    }
    if (errorType) {
      return <p role="alert">推し一覧の取得に失敗しました。</p>
    }
    if (items.length === 0) {
      return <p>登録済みの推しがありません。</p>
    }
    return (
      <ul
        className={`oshi-lists__items oshi-lists__items--${viewMode}`}
        aria-label="推しリストの動画一覧"
      >
        {items.map((item) => {
          const publishedLabel = item.publishedAt ?? '未設定'
          const hasSeriesLink = Boolean(item.seriesId)
          const seriesLink = hasSeriesLink
            ? `/series/${item.seriesId}/?selectedMovieId=${encodeURIComponent(
                String(item.id)
              )}`
            : null
          const playbackThumbnail = buildYouTubeThumbnailUrl(item.videoUrl)
          const thumbnailUrl = playbackThumbnail ?? item.thumbnailUrl
          const isOshi = Boolean(item.isOshi)
          const isUpdating = oshiUpdatingIds.includes(item.id)
          return (
            <li key={item.id} className="oshi-lists__item">
              <article className={isOshi ? 'oshi-lists__card' : 'oshi-lists__card is-inactive'}>
                <div className="oshi-lists__thumb">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={`${item.title}のサムネイル`} />
                  ) : (
                    <span className="oshi-lists__thumb-placeholder">
                      サムネイルなし
                    </span>
                  )}
                  {isOshi ? (
                    <span className="oshi-lists__badge" aria-label="推し登録済み">
                      推
                    </span>
                  ) : null}
                </div>
                <div className="oshi-lists__body">
                  <div className="oshi-lists__title-row">
                    <h2 className="oshi-lists__title">{item.title}</h2>
                    {isOshi ? <span className="oshi-lists__chip">推</span> : null}
                  </div>
                  <p className="oshi-lists__meta">公開日: {publishedLabel}</p>
                  <div className="oshi-lists__actions">
                    {hasSeriesLink ? (
                      <Link className="oshi-lists__link" to={seriesLink}>
                        作品ページで再生
                      </Link>
                    ) : (
                      <span className="oshi-lists__muted">
                        作品ページが未設定です。
                      </span>
                    )}
                    <button
                      type="button"
                      className={
                        isOshi
                          ? 'oshi-lists__oshi-button is-registered'
                          : 'oshi-lists__oshi-button'
                      }
                      aria-pressed={isOshi}
                      disabled={isUpdating}
                      onClick={() => handleOshiToggle(item.id)}
                    >
                      {isOshi ? '済' : '推'}
                    </button>
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <main className="oshi-lists">
      <h1>推しリスト</h1>
      <div className="oshi-lists__controls">
        <span className="oshi-lists__label">表示形式:</span>
        <div className="oshi-lists__toggle-group" role="group" aria-label="表示形式の切替">
          <button
            type="button"
            className={
              viewMode === 'list'
                ? 'oshi-lists__toggle is-active'
                : 'oshi-lists__toggle'
            }
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            リスト
          </button>
          <button
            type="button"
            className={
              viewMode === 'grid'
                ? 'oshi-lists__toggle is-active'
                : 'oshi-lists__toggle'
            }
            aria-pressed={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
          >
            グリッド
          </button>
        </div>
      </div>
      {oshiError ? (
        <p className="oshi-lists__status oshi-lists__status--error">
          推し登録に失敗しました。
        </p>
      ) : null}
      {renderContent()}
    </main>
  )
}

export default OshiListsPage
