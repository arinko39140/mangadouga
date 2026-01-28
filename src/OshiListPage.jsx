import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { publishOshiListUpdated, subscribeOshiListUpdated } from './oshiListEvents.js'
import { createOshiListPageProvider } from './oshiListPageProvider.js'
import { supabase } from './supabaseClient.js'
import './OshiListsPage.css'

const defaultDataProvider = createOshiListPageProvider(supabase)
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

function OshiListPage({ dataProvider = defaultDataProvider, authGate }) {
  const { listId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [oshiError, setOshiError] = useState(null)
  const [oshiUpdating, setOshiUpdating] = useState(false)
  const [oshiMovieError, setOshiMovieError] = useState(null)
  const [oshiMovieUpdatingIds, setOshiMovieUpdatingIds] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [canManageVisibility, setCanManageVisibility] = useState(false)
  const [visibility, setVisibility] = useState(null)
  const [visibilityUpdating, setVisibilityUpdating] = useState(false)
  const [visibilityError, setVisibilityError] = useState(null)
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      if (
        !dataProvider ||
        typeof dataProvider.fetchListSummary !== 'function' ||
        typeof dataProvider.fetchListItems !== 'function'
      ) {
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
      const [summaryResult, itemsResult] = await Promise.all([
        dataProvider.fetchListSummary(listId),
        dataProvider.fetchListItems(listId),
      ])
      if (!isMounted) return
      if (summaryResult.ok) {
        setSummary(summaryResult.data)
        setVisibility(summaryResult.data.visibility ?? null)
      } else {
        setSummary(null)
        setErrorType(summaryResult.error ?? 'unknown')
      }
      if (itemsResult.ok) {
        setItems(itemsResult.data)
      } else {
        setItems([])
        if (!summaryResult.ok) {
          setErrorType(summaryResult.error ?? itemsResult.error ?? 'unknown')
        }
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
  }, [authGateInstance, dataProvider, listId])

  useEffect(() => {
    let isMounted = true
    if (!dataProvider || typeof dataProvider.fetchVisibility !== 'function') {
      setCanManageVisibility(false)
      return () => {}
    }

    dataProvider.fetchVisibility(listId).then((result) => {
      if (!isMounted) return
      if (result.ok) {
        setCanManageVisibility(true)
        setVisibility(result.data.visibility ?? null)
      } else {
        setCanManageVisibility(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [dataProvider, listId])

  const handleFavoriteToggle = async () => {
    if (!dataProvider || typeof dataProvider.toggleFavorite !== 'function') return
    setOshiError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('oshi')
      return
    }

    setOshiUpdating(true)
    try {
      const result = await dataProvider.toggleFavorite(listId)
      if (result.ok) {
        setSummary((prev) => {
          if (!prev) return prev
          const nextFavorited = result.data.isFavorited
          const delta = nextFavorited ? 1 : -1
          return {
            ...prev,
            isFavorited: nextFavorited,
            favoriteCount: Math.max(0, (prev.favoriteCount ?? 0) + delta),
          }
        })
        publishOshiListUpdated()
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin('oshi')
      } else {
        setOshiError('failed')
      }
    } finally {
      setOshiUpdating(false)
    }
  }

  const handleOshiToggle = async (movieId) => {
    if (!dataProvider || typeof dataProvider.toggleMovieOshi !== 'function') return
    setOshiMovieError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('oshi')
      return
    }

    setOshiMovieUpdatingIds((prev) => (prev.includes(movieId) ? prev : [...prev, movieId]))
    try {
      const result = await dataProvider.toggleMovieOshi(movieId)
      if (result.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === movieId ? { ...item, isOshi: result.data.isOshi } : item
          )
        )
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin('oshi')
      } else {
        setOshiMovieError('failed')
      }
    } finally {
      setOshiMovieUpdatingIds((prev) => prev.filter((id) => id !== movieId))
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
      const result = await dataProvider.updateVisibility(listId, nextVisibility)
      if (result.ok) {
        setVisibility(result.data.visibility ?? null)
        setSummary((prev) =>
          prev ? { ...prev, visibility: result.data.visibility ?? prev.visibility } : prev
        )
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
      return <p role="alert">推しリストを表示できません。</p>
    }
    if (items.length === 0) {
      return <p>推し作品がありません。</p>
    }
    return (
      <ul
        className={`oshi-lists__items oshi-lists__items--${viewMode}`}
        aria-label="推し作品一覧"
      >
        {items.map((item) => {
          const thumbnailUrl = resolveThumbnailUrl(item)
          const isUpdating = oshiMovieUpdatingIds.includes(item.id)
          return (
            <li key={item.id} className="oshi-lists__item">
              <article className="oshi-lists__card">
                <div className="oshi-lists__thumb">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt={`${item.title}のサムネイル`} />
                  ) : (
                    <span className="oshi-lists__thumb-placeholder">サムネイル準備中</span>
                  )}
                </div>
                <div className="oshi-lists__body">
                  <div className="oshi-lists__title-row">
                    <h2 className="oshi-lists__title">{item.title}</h2>
                    <button
                      type="button"
                      className={
                        item.isOshi
                          ? 'oshi-lists__oshi-button is-registered'
                          : 'oshi-lists__oshi-button'
                      }
                      aria-pressed={item.isOshi}
                      disabled={isUpdating}
                      onClick={() => handleOshiToggle(item.id)}
                    >
                      {item.isOshi ? '済' : '推'}
                    </button>
                  </div>
                  <div className="oshi-lists__actions">
                    {item.seriesId ? (
                      <Link className="oshi-lists__link" to={`/series/${item.seriesId}/`}>
                        作品ページへ
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    )
  }

  const isFavorited = Boolean(summary?.isFavorited)
  const isOwner = Boolean(summary?.isOwner)
  const visibilityLabel = visibility === 'private' ? '非公開' : '公開'

  return (
    <main className="oshi-lists">
      <header className="oshi-lists__header">
        <h1>推しリスト</h1>
        {summary?.name ? <p className="oshi-lists__meta">{summary.name}</p> : null}
        <p className="oshi-lists__meta">お気に入り数: {summary?.favoriteCount ?? 0}</p>
        <span className="oshi-lists__chip">{isFavorited ? '済' : '推'}</span>
        {!isOwner ? (
          <button
            type="button"
            className={
              isFavorited
                ? 'oshi-lists__oshi-button is-registered'
                : 'oshi-lists__oshi-button'
            }
            aria-pressed={isFavorited}
            disabled={oshiUpdating}
            onClick={handleFavoriteToggle}
          >
            {isFavorited ? '解除' : '登録'}
          </button>
        ) : null}
        {oshiError ? (
          <p className="oshi-lists__status oshi-lists__status--error">
            お気に入り操作に失敗しました。
          </p>
        ) : null}
        {canManageVisibility ? (
          <div className="oshi-lists__controls" role="group" aria-label="公開設定">
            <span className="oshi-lists__label">公開設定:</span>
            <div className="oshi-lists__toggle-group">
              <button
                type="button"
                className={
                  visibility === 'public'
                    ? 'oshi-lists__toggle is-active'
                    : 'oshi-lists__toggle'
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
                  visibility === 'private'
                    ? 'oshi-lists__toggle is-active'
                    : 'oshi-lists__toggle'
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
        {visibilityError ? (
          <p className="oshi-lists__status oshi-lists__status--error">
            公開設定の更新に失敗しました。
          </p>
        ) : null}
      </header>
      {oshiMovieError ? (
        <p className="oshi-lists__status oshi-lists__status--error">
          推し登録に失敗しました。
        </p>
      ) : null}
      <div className="oshi-lists__controls" role="group" aria-label="表示形式">
        <span className="oshi-lists__label">表示形式:</span>
        <div className="oshi-lists__toggle-group">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={
                viewMode === mode.id ? 'oshi-lists__toggle is-active' : 'oshi-lists__toggle'
              }
              aria-pressed={viewMode === mode.id}
              onClick={() => setViewMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      {renderContent()}
    </main>
  )
}

export default OshiListPage
