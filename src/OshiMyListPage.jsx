import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createOshiListDataProvider } from './oshiListDataProvider.js'
import { publishOshiListUpdated, subscribeOshiListUpdated } from './oshiListEvents.js'
import { supabase } from './supabaseClient.js'
import './OshiListsPage.css'

const defaultDataProvider = createOshiListDataProvider(supabase)
const VIEW_MODES = [
  { id: 'list', label: 'リスト' },
  { id: 'grid', label: 'グリッド' },
]

const getYouTubeVideoId = (videoUrl) => {
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
    return id || null
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (pathname === '/watch') {
      return parsed.searchParams.get('v')
    }

    if (pathname.startsWith('/embed/')) {
      return pathname.split('/').filter(Boolean)[1] ?? null
    }

    if (pathname.startsWith('/shorts/')) {
      return pathname.split('/').filter(Boolean)[1] ?? null
    }
  }

  return null
}

const resolveThumbnailUrl = (item) => {
  if (item.thumbnailUrl) return item.thumbnailUrl
  const videoId = getYouTubeVideoId(item.videoUrl)
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
}

function OshiMyListPage({ dataProvider = defaultDataProvider, authGate }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [items, setItems] = useState([])
  const [oshiError, setOshiError] = useState(null)
  const [oshiUpdatingIds, setOshiUpdatingIds] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [canManageVisibility, setCanManageVisibility] = useState(false)
  const [visibility, setVisibility] = useState(null)
  const [visibilityUpdating, setVisibilityUpdating] = useState(false)
  const [visibilityError, setVisibilityError] = useState(null)
  const [favoriteCount, setFavoriteCount] = useState(null)
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
      setVisibilityError(null)
      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok) {
        setIsLoading(false)
        authGateInstance.redirectToLogin()
        return
      }
      const canUseVisibility =
        typeof dataProvider.fetchVisibility === 'function' &&
        typeof dataProvider.updateVisibility === 'function'
      const canUseFavoriteCount = typeof dataProvider.fetchFavoriteCount === 'function'
      if (!canUseVisibility) {
        setCanManageVisibility(false)
        setVisibility(null)
      }
      if (!canUseFavoriteCount) {
        setFavoriteCount(null)
      }

      const [result, visibilityResult, favoriteResult] = await Promise.all([
        dataProvider.fetchOshiList(),
        canUseVisibility ? dataProvider.fetchVisibility() : Promise.resolve(null),
        canUseFavoriteCount ? dataProvider.fetchFavoriteCount() : Promise.resolve(null),
      ])
      if (!isMounted) return
      if (result.ok) {
        setItems(result.data)
      } else {
        setItems([])
        setErrorType(result.error ?? 'unknown')
      }
      if (visibilityResult) {
        if (visibilityResult.ok) {
          setCanManageVisibility(true)
          setVisibility(visibilityResult.data.visibility ?? null)
        } else {
          setCanManageVisibility(false)
          setVisibility(null)
        }
      }
      if (favoriteResult?.ok) {
        setFavoriteCount(favoriteResult.data.favoriteCount ?? 0)
      } else if (favoriteResult) {
        setFavoriteCount(null)
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
        setItems((prev) =>
          prev.map((item) =>
            item.id === movieId ? { ...item, isOshi: result.data.isOshi } : item
          )
        )
        if (result.data.isOshi) {
          publishOshiListUpdated()
        }
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin('oshi')
      } else {
        setOshiError('failed')
      }
    } finally {
      setOshiUpdatingIds((prev) => prev.filter((id) => id !== movieId))
    }
  }

  const handleVisibilityChange = async (nextVisibility) => {
    if (!dataProvider || typeof dataProvider.updateVisibility !== 'function') return
    setVisibilityError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin()
      return
    }

    setVisibilityUpdating(true)
    try {
      const result = await dataProvider.updateVisibility(nextVisibility)
      if (result.ok) {
        setVisibility(result.data.visibility ?? null)
        publishOshiListUpdated()
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin()
      } else {
        setVisibilityError('failed')
      }
    } finally {
      setVisibilityUpdating(false)
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <p>読み込み中です。</p>
    }
    if (errorType) {
      return <p role="alert">推しリストの取得に失敗しました。</p>
    }
    if (items.length === 0) {
      return <p>推し登録済みの動画がありません。</p>
    }
    return (
      <ul
        className={`oshi-lists__items oshi-lists__items--${viewMode}`}
        aria-label="推し作品一覧"
      >
        {items.map((item) => {
          const isUpdating = oshiUpdatingIds.includes(item.id)
          const thumbnailUrl = resolveThumbnailUrl(item)
          return (
            <li key={item.id} className="oshi-lists__item">
              <article className="oshi-lists__card">
                <div className="oshi-lists__thumb">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={item.title} />
                  ) : (
                    <span className="oshi-lists__thumb-placeholder">サムネイル準備中</span>
                  )}
                </div>
                <div className="oshi-lists__body">
                  <div className="oshi-lists__title-row">
                    <h2 className="oshi-lists__title">{item.title}</h2>
                  </div>
                  {item.seriesId ? (
                    <Link className="oshi-lists__link" to={`/series/${item.seriesId}/`}>
                      作品ページへ
                    </Link>
                  ) : null}
                  <div className="oshi-lists__actions">
                    <button
                      type="button"
                      className="oshi-lists__oshi-button is-registered"
                      aria-pressed
                      disabled={isUpdating}
                      onClick={() => handleOshiToggle(item.id)}
                    >
                      {item.isOshi ? '済' : '推'}
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

  const visibilityLabel = visibility === 'private' ? '非公開' : '公開'

  return (
    <main className="oshi-lists">
      <h1>推しリスト</h1>
      {favoriteCount !== null ? (
        <p className="oshi-lists__meta">お気に入り登録数: {favoriteCount}</p>
      ) : null}
      <div className="oshi-lists__controls">
        <span className="oshi-lists__label">表示形式:</span>
        <div className="oshi-lists__toggle-group" role="group" aria-label="表示形式">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={
                viewMode === mode.id
                  ? 'oshi-lists__toggle is-active'
                  : 'oshi-lists__toggle'
              }
              aria-pressed={viewMode === mode.id}
              onClick={() => setViewMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      {canManageVisibility ? (
        <div className="oshi-lists__controls" role="group" aria-label="公開設定">
          <span className="oshi-lists__label">公開設定:</span>
          <div className="oshi-lists__toggle-group">
            <button
              type="button"
              className={
                visibility === 'public' ? 'oshi-lists__toggle is-active' : 'oshi-lists__toggle'
              }
              aria-pressed={visibility === 'public'}
              disabled={visibilityUpdating}
              onClick={() => handleVisibilityChange('public')}
            >
              公開
            </button>
            <button
              type="button"
              className={
                visibility === 'private' ? 'oshi-lists__toggle is-active' : 'oshi-lists__toggle'
              }
              aria-pressed={visibility === 'private'}
              disabled={visibilityUpdating}
              onClick={() => handleVisibilityChange('private')}
            >
              非公開
            </button>
          </div>
          <span className="oshi-lists__muted">現在: {visibilityLabel}</span>
        </div>
      ) : null}
      {oshiError ? (
        <p className="oshi-lists__status oshi-lists__status--error">
          推し登録の更新に失敗しました。
        </p>
      ) : null}
      {visibilityError ? (
        <p className="oshi-lists__status oshi-lists__status--error">
          公開設定の更新に失敗しました。
        </p>
      ) : null}
      {renderContent()}
    </main>
  )
}

export default OshiMyListPage
