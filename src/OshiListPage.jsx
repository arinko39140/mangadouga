import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { publishOshiListUpdated, subscribeOshiListUpdated } from './oshiListEvents.js'
import { createOshiListPageProvider } from './oshiListPageProvider.js'
import { supabase } from './supabaseClient.js'
import './OshiListsPage.css'

const defaultDataProvider = createOshiListPageProvider(supabase)

function OshiListPage({ dataProvider = defaultDataProvider, authGate }) {
  const { listId } = useParams()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [oshiError, setOshiError] = useState(null)
  const [oshiUpdating, setOshiUpdating] = useState(false)
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
      <ul className="oshi-lists__items oshi-lists__items--grid" aria-label="推し作品一覧">
        {items.map((item) => (
          <li key={item.id} className="oshi-lists__item">
            <article className="oshi-lists__card">
              <div className="oshi-lists__body">
                <h2 className="oshi-lists__title">{item.title}</h2>
              </div>
            </article>
          </li>
        ))}
      </ul>
    )
  }

  const isFavorited = Boolean(summary?.isFavorited)
  const visibilityLabel = visibility === 'private' ? '非公開' : '公開'

  return (
    <main className="oshi-lists">
      <header className="oshi-lists__header">
        <h1>推しリスト</h1>
        {summary?.name ? <p className="oshi-lists__meta">{summary.name}</p> : null}
        <p className="oshi-lists__meta">お気に入り数: {summary?.favoriteCount ?? 0}</p>
        <span className="oshi-lists__chip">{isFavorited ? '済' : '推'}</span>
        <button
          type="button"
          className={isFavorited ? 'oshi-lists__oshi-button is-registered' : 'oshi-lists__oshi-button'}
          aria-pressed={isFavorited}
          disabled={oshiUpdating}
          onClick={handleFavoriteToggle}
        >
          {isFavorited ? '解除' : '登録'}
        </button>
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
      {renderContent()}
    </main>
  )
}

export default OshiListPage
