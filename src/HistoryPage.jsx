import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createHistoryRecorder } from './historyRecorder.js'
import { createNavigateToMovie } from './navigateToMovie.js'
import { supabase } from './supabaseClient.js'
import { createViewingHistoryProvider } from './viewingHistoryProvider.js'
import { useInViewMotion } from './hooks/useInViewMotion.js'
import './HistoryPage.css'

const defaultDataProvider = createViewingHistoryProvider(supabase)
const defaultHistoryRecorder = createHistoryRecorder(supabase)

const buildMotionClassName = (baseClassName, motionState) => {
  if (motionState.shouldReduceMotion) return baseClassName
  return `${baseClassName} motion-appear${motionState.isInView ? ' is-inview' : ''}`
}

const HistoryCard = ({ item, navigateToMovieHandler }) => {
  const motion = useInViewMotion()

  return (
    <article
      ref={motion.ref}
      className={buildMotionClassName('history-card card-secondary card-interactive', motion)}
    >
      <div className="history-card__thumb">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt={item.title} />
        ) : (
          <span className="history-card__thumb-placeholder media-text">
            サムネイル準備中
          </span>
        )}
      </div>
      <div className="history-card__body">
        <div className="history-card__title-row">
          <h2 className="history-card__title text-strong">{item.title}</h2>
          {item.isOshi ? (
            <span
              className="history-card__oshi state-badge state-badge--active"
              aria-label="推しバッジ"
            >
              推
            </span>
          ) : null}
        </div>
        {item.seriesId ? (
          <Link
            className="history-card__link"
            to={
              item.movieId
                ? `/series/${item.seriesId}/?selectedMovieId=${item.movieId}`
                : `/series/${item.seriesId}/`
            }
            onClick={(event) => {
              event.preventDefault()
              navigateToMovieHandler({
                seriesId: item.seriesId,
                movieId: item.movieId,
              })
            }}
          >
            作品ページへ
          </Link>
        ) : null}
        <p className="history-card__meta text-muted">最終閲覧: {item.clickedAt}</p>
      </div>
    </article>
  )
}

function HistoryPage({ authGate, dataProvider = defaultDataProvider, navigateToMovie }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [items, setItems] = useState([])
  const [authRequired, setAuthRequired] = useState(false)
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])
  const navigateToMovieHandler = useMemo(() => {
    if (typeof navigateToMovie === 'function') return navigateToMovie
    return createNavigateToMovie({ navigate, historyRecorder: defaultHistoryRecorder })
  }, [navigate, navigateToMovie])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      setIsLoading(true)
      setErrorType(null)
      setAuthRequired(false)

      if (!dataProvider || typeof dataProvider.fetchHistory !== 'function') {
        if (!isMounted) return
        setIsLoading(false)
        setErrorType('not_configured')
        return
      }

      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok || status.status?.isAuthenticated === false) {
        authGateInstance.redirectToLogin()
        setAuthRequired(true)
        setIsLoading(false)
        return
      }

      const result = await dataProvider.fetchHistory()
      if (!isMounted) return
      if (result.ok) {
        setItems(result.data)
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin()
        setAuthRequired(true)
        setItems([])
      } else {
        setItems([])
        setErrorType(result.error ?? 'unknown')
      }
      setIsLoading(false)
    }

    fetchIfAuthenticated()

    return () => {
      isMounted = false
    }
  }, [authGateInstance, dataProvider])

  const renderContent = () => {
    if (authRequired) return null
    if (isLoading) {
      return <p>読み込み中です。</p>
    }
    if (errorType) {
      return <p role="alert">閲覧履歴の取得に失敗しました。</p>
    }
    if (items.length === 0) {
      return (
        <div className="history-page__empty">
          <p>閲覧履歴がありません。</p>
          <Link to="/">トップページへ戻る</Link>
        </div>
      )
    }
    return (
      <ul
        className="history-list card-collection card-collection--grid"
        aria-label="閲覧履歴一覧"
      >
        {items.map((item) => (
          <li key={item.historyId} className="history-list__item">
            <HistoryCard item={item} navigateToMovieHandler={navigateToMovieHandler} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <main className="history-page">
      <h1>閲覧履歴</h1>
      {renderContent()}
    </main>
  )
}

export default HistoryPage
