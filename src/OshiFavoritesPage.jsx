import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createOshiFavoritesProvider } from './oshiFavoritesProvider.js'
import { publishOshiListUpdated, subscribeOshiListUpdated } from './oshiListEvents.js'
import { supabase } from './supabaseClient.js'
import './OshiListsPage.css'

const defaultDataProvider = createOshiFavoritesProvider(supabase)

function OshiFavoritesPage({ dataProvider = defaultDataProvider, authGate }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [items, setItems] = useState([])
  const [oshiError, setOshiError] = useState(null)
  const [oshiUpdatingIds, setOshiUpdatingIds] = useState([])
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      if (!dataProvider || typeof dataProvider.fetchFavorites !== 'function') {
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
      const result = await dataProvider.fetchFavorites()
      if (!isMounted) return
      if (result.ok) {
        setItems(result.data)
      } else {
        setItems([])
        setErrorType(result.error ?? 'unknown')
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

  const handleOshiToggle = async (listId) => {
    if (!dataProvider || typeof dataProvider.toggleFavorite !== 'function') return
    setOshiError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      authGateInstance.redirectToLogin('oshi')
      return
    }

    setOshiUpdatingIds((prev) => (prev.includes(listId) ? prev : [...prev, listId]))
    try {
      const result = await dataProvider.toggleFavorite(listId)
      if (result.ok) {
        if (!result.data.isFavorited) {
          setItems((prev) => prev.filter((item) => item.listId !== listId))
        }
        publishOshiListUpdated()
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin('oshi')
      } else {
        setOshiError('failed')
      }
    } finally {
      setOshiUpdatingIds((prev) => prev.filter((id) => id !== listId))
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return <p>読み込み中です。</p>
    }
    if (errorType) {
      return <p role="alert">お気に入り推しリストの取得に失敗しました。</p>
    }
    if (items.length === 0) {
      return <p>お気に入り登録済みの推しリストがありません。</p>
    }
    return (
      <ul className="oshi-lists__items oshi-lists__items--grid" aria-label="お気に入り推しリスト">
        {items.map((item) => {
          const isFavorited = Boolean(item.isFavorited)
          const isUpdating = oshiUpdatingIds.includes(item.listId)
          return (
            <li key={item.listId} className="oshi-lists__item">
              <article className="oshi-lists__card">
                <div className="oshi-lists__body">
                  <div className="oshi-lists__title-row">
                    <h2 className="oshi-lists__title">
                      <span className="oshi-lists__user">
                        <span className="oshi-lists__avatar" aria-hidden="true">
                          {item.iconUrl ? (
                            <img src={item.iconUrl} alt="" aria-hidden="true" />
                          ) : (
                            <span className="oshi-lists__avatar-placeholder">?</span>
                          )}
                        </span>
                        <span className="oshi-lists__title-name">{item.name}</span>
                      </span>
                    </h2>
                    {isFavorited ? <span className="oshi-lists__chip">推</span> : null}
                  </div>
                  <p className="oshi-lists__meta">お気に入り数: {item.favoriteCount ?? 0}</p>
                  <div className="oshi-lists__actions">
                    <span className="oshi-lists__muted">登録済み</span>
                    <button
                      type="button"
                      className={
                        isFavorited
                          ? 'oshi-lists__oshi-button is-registered'
                          : 'oshi-lists__oshi-button'
                      }
                      aria-pressed={isFavorited}
                      disabled={isUpdating}
                      onClick={() => handleOshiToggle(item.listId)}
                    >
                      {isFavorited ? '解除' : '登録'}
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
      <h1>お気に入り推しリスト</h1>
      {oshiError ? (
        <p className="oshi-lists__status oshi-lists__status--error">
          お気に入り操作に失敗しました。
        </p>
      ) : null}
      {renderContent()}
    </main>
  )
}

export default OshiFavoritesPage
