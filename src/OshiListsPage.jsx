import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createOshiListCatalogProvider } from './oshiListCatalogProvider.js'
import { publishOshiListUpdated, subscribeOshiListUpdated } from './oshiListEvents.js'
import { DEFAULT_SORT_ORDER, normalizeSortOrder } from './sortOrderPolicy.js'
import SortControl from './SortControl.jsx'
import { supabase } from './supabaseClient.js'
import { useInViewMotion } from './hooks/useInViewMotion.js'
import './OshiListsPage.css'

const defaultDataProvider = createOshiListCatalogProvider(supabase)

const buildMotionClassName = (baseClassName, motionState) => {
  if (motionState.shouldReduceMotion) return baseClassName
  return `${baseClassName} motion-appear${motionState.isInView ? ' is-inview' : ''}`
}

const OshiListCard = ({ item, isUpdating, isOwner, onToggle }) => {
  const motion = useInViewMotion()
  const isFavorited = Boolean(item.isFavorited)
  const canLinkToUser = Boolean(item.userId)
  const className = buildMotionClassName(
    isFavorited
      ? 'oshi-lists__card card-primary card-interactive'
      : 'oshi-lists__card card-primary card-interactive is-inactive',
    motion
  )

  return (
    <article ref={motion.ref} className={className}>
      <div className="oshi-lists__body">
        <div className="oshi-lists__title-row">
          <h2 className="oshi-lists__title text-strong">
            {canLinkToUser ? (
              <Link className="oshi-lists__user" to={`/users/${item.userId}/`}>
                <span className="oshi-lists__avatar" aria-hidden="true">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" aria-hidden="true" />
                  ) : (
                    <span className="oshi-lists__avatar-placeholder">?</span>
                  )}
                </span>
                <span className="oshi-lists__title-name text-strong">
                  {item.name}
                </span>
              </Link>
            ) : (
              <span className="oshi-lists__user">
                <span className="oshi-lists__avatar" aria-hidden="true">
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" aria-hidden="true" />
                  ) : (
                    <span className="oshi-lists__avatar-placeholder">?</span>
                  )}
                </span>
                <span className="oshi-lists__title-name text-strong">
                  {item.name}
                </span>
              </span>
            )}
          </h2>
          <span
            className={
              isFavorited
                ? 'oshi-lists__chip state-badge state-badge--active'
                : 'oshi-lists__chip state-badge state-badge--inactive'
            }
          >
            {isFavorited ? '済' : '推'}
          </span>
        </div>
        <p className="oshi-lists__meta">お気に入り数: {item.favoriteCount ?? 0}</p>
        <div className="oshi-lists__actions">
          <span className="oshi-lists__muted">公開中</span>
          {!isOwner ? (
            <button
              type="button"
              className={isFavorited ? 'oshi-lists__oshi-button is-registered' : 'oshi-lists__oshi-button'}
              aria-pressed={isFavorited}
              disabled={isUpdating}
              onClick={() => onToggle(item.listId)}
            >
              {isFavorited ? '解除' : '登録'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function OshiListsPage({ dataProvider = defaultDataProvider, authGate }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [items, setItems] = useState([])
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER)
  const [oshiError, setOshiError] = useState(null)
  const [oshiUpdatingIds, setOshiUpdatingIds] = useState([])
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      if (!dataProvider || typeof dataProvider.fetchCatalog !== 'function') {
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
      const normalizedSortOrder = normalizeSortOrder(sortOrder)
      const result = await dataProvider.fetchCatalog({ sortOrder: normalizedSortOrder })
      if (!isMounted) return
      if (result.ok) {
        setItems(result.data)
      } else {
        if (result.error === 'auth_required') {
          setIsLoading(false)
          authGateInstance.redirectToLogin()
          return
        }
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
  }, [authGateInstance, dataProvider, sortOrder])

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
        setItems((prev) => {
          return prev.map((item) => {
            if (item.listId !== listId) return item
            const nextFavorited = result.data.isFavorited
            const delta = nextFavorited ? 1 : -1
            return {
              ...item,
              isFavorited: nextFavorited,
              favoriteCount: Math.max(0, (item.favoriteCount ?? 0) + delta),
            }
          })
        })
        publishOshiListUpdated()
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
      return <p role="alert">推しリストの取得に失敗しました。</p>
    }
    if (items.length === 0) {
      return <p>公開されている推しリストがありません。</p>
    }
    return (
      <ul
        className="oshi-lists__items oshi-lists__items--grid card-collection card-collection--grid"
        aria-label="推しリスト一覧"
      >
        {items.map((item) => (
          <li key={item.listId} className="oshi-lists__item">
            <OshiListCard
              item={item}
              isUpdating={oshiUpdatingIds.includes(item.listId)}
              isOwner={Boolean(item.isOwner)}
              onToggle={handleOshiToggle}
            />
          </li>
        ))}
      </ul>
    )
  }

  const normalizedSortOrder = normalizeSortOrder(sortOrder)

  return (
    <main className="oshi-lists">
      <h1>みんなの推しリスト</h1>
      <div className="oshi-lists__controls">
        <span className="oshi-lists__label">並び順:</span>
        <SortControl
          sortOrder={normalizedSortOrder}
          onChange={setSortOrder}
          options={[
            { value: 'popular', label: '人気' },
            { value: 'favorite_asc', label: '人気(少ない順)' },
          ]}
        />
      </div>
      {oshiError ? (
        <p className="oshi-lists__status oshi-lists__status--error state-badge state-badge--warning">
          推し登録に失敗しました。
        </p>
      ) : null}
      {renderContent()}
    </main>
  )
}

export default OshiListsPage
