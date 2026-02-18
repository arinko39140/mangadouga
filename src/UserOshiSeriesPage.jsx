import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import ExternalLinksPanel from './ExternalLinksPanel.jsx'
import UserInfoPanel from './UserInfoPanel.jsx'
import { createHistoryRecorder } from './historyRecorder.js'
import { createNavigateToMovie } from './navigateToMovie.js'
import { createProfileVisibilityProvider } from './profileVisibilityProvider.js'
import { resolveCurrentUserId } from './supabaseSession.js'
import { supabase } from './supabaseClient.js'
import { publishUserSeriesUpdated, subscribeUserSeriesUpdated } from './userSeriesEvents.js'
import { createUserPageProvider } from './userPageProvider.js'
import { createUserSeriesProvider } from './userSeriesProvider.js'
import './UserOshiSeriesPage.css'

const defaultProfileProvider = createUserPageProvider(supabase)
const defaultSeriesProvider = createUserSeriesProvider(supabase)
const defaultVisibilityProvider = createProfileVisibilityProvider(supabase)
const defaultHistoryRecorder = createHistoryRecorder(supabase)

const normalizeVisibility = (value) => (value === 'public' ? 'public' : 'private')
const viewModes = [
  { id: 'grid', label: 'グリッド' },
  { id: 'list', label: 'リスト' },
]
const resolveSort = (sortOrder) => ({
  key: 'favorite_count',
  order: sortOrder === 'favorite_asc' ? 'asc' : 'desc',
})

function UserOshiSeriesPage({
  profileProvider = defaultProfileProvider,
  seriesProvider = defaultSeriesProvider,
  visibilityProvider = defaultVisibilityProvider,
  authGate,
  navigateToMovie,
}) {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [seriesItems, setSeriesItems] = useState([])
  const [seriesError, setSeriesError] = useState(null)
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [seriesVisibility, setSeriesVisibility] = useState('private')
  const [viewMode, setViewMode] = useState('grid')
  const [sortOrder, setSortOrder] = useState('favorite_desc')
  const [seriesActionError, setSeriesActionError] = useState(null)
  const [seriesUpdatingIds, setSeriesUpdatingIds] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [viewerUserId, setViewerUserId] = useState(null)

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

    const resetState = () => {
      setProfile(null)
      setProfileError(null)
      setProfileLoading(true)
      setSeriesItems([])
      setSeriesError(null)
      setSeriesLoading(true)
      setSeriesVisibility('private')
      setSeriesActionError(null)
      setSeriesUpdatingIds([])
      setViewerUserId(null)
    }

    const fetchAll = async () => {
      if (!profileProvider || typeof profileProvider.fetchUserProfile !== 'function') {
        setProfileError('not_configured')
        setProfileLoading(false)
        setSeriesLoading(false)
        return
      }

      resetState()
      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok) {
        setIsAuthenticated(false)
        setProfileLoading(false)
        setSeriesLoading(false)
        authGateInstance.redirectToLogin()
        return
      }
      setIsAuthenticated(true)

      const viewerResult = await resolveCurrentUserId(supabase)
      if (!isMounted) return
      const viewerUserId = viewerResult.ok ? viewerResult.userId : null
      setViewerUserId(viewerUserId)
      const isOwner = typeof viewerUserId === 'string' && viewerUserId === userId

      const profileResult = await profileProvider.fetchUserProfile(userId)
      if (!isMounted) return
      if (!profileResult.ok) {
        setProfileError(profileResult.error ?? 'unknown')
        setProfileLoading(false)
        setSeriesLoading(false)
        if (profileResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
        return
      }

      setProfile(profileResult.data)
      setProfileLoading(false)

      let resolvedSeriesVisibility = 'public'
      if (isOwner) {
        resolvedSeriesVisibility = 'public'
      } else if (
        !visibilityProvider ||
        typeof visibilityProvider.fetchVisibility !== 'function'
      ) {
        resolvedSeriesVisibility = 'private'
      } else {
        const visibilityResult = await visibilityProvider.fetchVisibility({
          targetUserId: userId,
        })
        if (!isMounted) return
        if (visibilityResult?.ok) {
          resolvedSeriesVisibility = normalizeVisibility(visibilityResult.data?.oshiSeries)
        } else {
          resolvedSeriesVisibility = 'private'
        }
      }

      setSeriesVisibility(resolvedSeriesVisibility)

      if (!isOwner && resolvedSeriesVisibility !== 'public') {
        setSeriesItems([])
        setSeriesError(null)
        setSeriesLoading(false)
        return
      }

      const seriesResult =
        seriesProvider && typeof seriesProvider.fetchSeriesList === 'function'
          ? await seriesProvider.fetchSeriesList({
              targetUserId: userId,
              viewerUserId,
              sort: resolveSort(sortOrder),
            })
          : { ok: false, error: 'not_configured' }

      if (!isMounted) return

      if (seriesResult.ok) {
        const nextItems = Array.isArray(seriesResult.data) ? seriesResult.data : []
        setSeriesItems(nextItems)
      } else {
        setSeriesItems([])
        setSeriesError(seriesResult.error ?? 'unknown')
        if (seriesResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
      }

      setSeriesLoading(false)
    }

    fetchAll()

    return () => {
      isMounted = false
    }
  }, [
    authGateInstance,
    profileProvider,
    seriesProvider,
    visibilityProvider,
    userId,
    reloadToken,
    sortOrder,
  ])

  const handleRetry = () => {
    setReloadToken((prev) => prev + 1)
  }

  useEffect(() => {
    const unsubscribe = subscribeUserSeriesUpdated(() => {
      setReloadToken((prev) => prev + 1)
    })
    return () => unsubscribe()
  }, [])

  const isNotFound = profileError === 'not_found'
  const hasPageError = Boolean(profileError)
  const shouldShowRetry = (!isNotFound && Boolean(profileError)) || Boolean(seriesError)

  const renderProfileError = () => {
    if (!profileError) return null
    const message = isNotFound
      ? 'ユーザーが見つかりません。'
      : 'ユーザー情報の取得に失敗しました。'
    return (
      <p className="user-series-page__status user-series-page__status--error" role="alert">
        {message}
      </p>
    )
  }

  const renderExternalLinks = () => {
    if (profileLoading) {
      return (
        <section className="external-links" aria-live="polite">
          <header className="external-links__header">
            <h2 className="external-links__title">外部リンク</h2>
          </header>
          <p className="external-links__empty">外部リンクを読み込み中...</p>
        </section>
      )
    }

    return <ExternalLinksPanel links={profile?.links ?? []} />
  }

  const handleRegisterSeries = async (seriesId) => {
    if (!seriesProvider || typeof seriesProvider.registerSeries !== 'function') return
    if (!seriesId) return
    setSeriesActionError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      setIsAuthenticated(false)
      authGateInstance.redirectToLogin()
      return
    }
    setIsAuthenticated(true)

    setSeriesUpdatingIds((prev) => (prev.includes(seriesId) ? prev : [...prev, seriesId]))
    try {
      const result = await seriesProvider.registerSeries({ seriesId })
      if (result.ok) {
        setSeriesItems((prev) =>
          prev.map((item) =>
            item.seriesId !== seriesId ? item : { ...item, isRegistered: true }
          )
        )
        publishUserSeriesUpdated()
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin()
      } else {
        setSeriesActionError('failed')
      }
    } finally {
      setSeriesUpdatingIds((prev) => prev.filter((id) => id !== seriesId))
    }
  }

  const handleUnregisterSeries = async (seriesId, { removeFromList = true } = {}) => {
    if (!seriesProvider || typeof seriesProvider.unregisterSeries !== 'function') return
    if (!seriesId) return
    setSeriesActionError(null)

    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      setIsAuthenticated(false)
      authGateInstance.redirectToLogin()
      return
    }
    setIsAuthenticated(true)

    setSeriesUpdatingIds((prev) => (prev.includes(seriesId) ? prev : [...prev, seriesId]))
    try {
      const result = await seriesProvider.unregisterSeries({ seriesId })
      if (result.ok) {
        setSeriesItems((prev) =>
          removeFromList
            ? prev.filter((item) => item.seriesId !== seriesId)
            : prev.map((item) =>
                item.seriesId !== seriesId ? item : { ...item, isRegistered: false }
              )
        )
        publishUserSeriesUpdated()
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin()
      } else {
        setSeriesActionError('failed')
      }
    } finally {
      setSeriesUpdatingIds((prev) => prev.filter((id) => id !== seriesId))
    }
  }

  const renderSeriesList = () => {
    const isOwner = Boolean(viewerUserId) && viewerUserId === userId
    if (seriesLoading) {
      return <p className="user-series-list__status">推し作品を読み込み中...</p>
    }
    if (seriesError) {
      return (
        <p className="user-series-list__status user-series-list__status--error" role="alert">
          推し作品の取得に失敗しました。
        </p>
      )
    }
    if (seriesVisibility !== 'public') {
      return <p className="user-series-list__status">この推し作品は非公開です。</p>
    }
    if (seriesItems.length === 0) {
      return <p className="user-series-list__status">推し作品がありません。</p>
    }

    return (
      <ul
        className={`user-series-list__items user-series-list__items--${viewMode}`}
        aria-label="推し作品一覧"
      >
        {seriesItems.map((item) => (
          <li key={item.seriesId} className="user-series-list__item">
            <article className="user-series-list__card">
              <div className="user-series-list__thumb">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={`${item.title}のサムネイル`}
                    loading="lazy"
                  />
                ) : (
                  <span className="user-series-list__thumb-placeholder">
                    サムネイル準備中
                  </span>
                )}
              </div>
              <div className="user-series-list__body">
                <h2 className="user-series-list__title">
                  {item.seriesId ? (
                    <Link
                      to={`/series/${item.seriesId}/`}
                      onClick={(event) => {
                        event.preventDefault()
                        navigateToMovieHandler({ seriesId: item.seriesId })
                      }}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    item.title
                  )}
                </h2>
                {item.favoriteCount != null ? (
                  <p className="user-series-list__meta">
                    お気に入り数: {item.favoriteCount}
                  </p>
                ) : null}
                {item.seriesId ? (
                  <div className="user-series-list__actions">
                    <Link
                      className="user-series-list__link"
                      to={`/series/${item.seriesId}/`}
                      onClick={(event) => {
                        event.preventDefault()
                        navigateToMovieHandler({ seriesId: item.seriesId })
                      }}
                    >
                      作品ページへ
                    </Link>
                    <button
                      type="button"
                      className={
                        item.isRegistered
                          ? 'user-series-list__oshi-button is-registered'
                          : 'user-series-list__oshi-button'
                      }
                      aria-pressed={isOwner ? true : Boolean(item.isRegistered)}
                      disabled={seriesUpdatingIds.includes(item.seriesId)}
                      onClick={() =>
                        isOwner
                          ? handleUnregisterSeries(item.seriesId, { removeFromList: true })
                          : item.isRegistered
                            ? handleUnregisterSeries(item.seriesId, { removeFromList: false })
                            : handleRegisterSeries(item.seriesId)
                      }
                    >
                      {isOwner ? '解除' : item.isRegistered ? '解除' : '登録'}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <main className="user-series-page">
      <header className="user-series-page__header">
        <h1 className="user-series-page__title">推し作品一覧</h1>
        {profile?.name ? (
          <p className="user-series-page__subtitle">{profile.name}</p>
        ) : null}
      </header>

      {hasPageError ? (
        renderProfileError()
      ) : (
        <div className="user-series-page__sections">
          <UserInfoPanel profile={profile} isLoading={profileLoading} />
          {renderExternalLinks()}
          <section className="user-series-list" aria-live="polite">
            <header className="user-series-list__header">
              <h2 className="user-series-list__heading">推し作品一覧</h2>
              <div className="user-series-list__controls" role="group" aria-label="表示形式">
                <span className="user-series-list__label">表示形式:</span>
                <div className="user-series-list__toggle-group">
                  {viewModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={
                        viewMode === mode.id
                          ? 'user-series-list__toggle is-active'
                          : 'user-series-list__toggle'
                      }
                      onClick={() => setViewMode(mode.id)}
                      aria-pressed={viewMode === mode.id}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="user-series-list__controls" role="group" aria-label="並び替え">
                <span className="user-series-list__label">お気に入り数:</span>
                <div className="user-series-list__toggle-group">
                  <button
                    type="button"
                    className={
                      sortOrder === 'favorite_desc'
                        ? 'user-series-list__toggle is-active'
                        : 'user-series-list__toggle'
                    }
                    aria-pressed={sortOrder === 'favorite_desc'}
                    onClick={() => setSortOrder('favorite_desc')}
                  >
                    多い順
                  </button>
                  <button
                    type="button"
                    className={
                      sortOrder === 'favorite_asc'
                        ? 'user-series-list__toggle is-active'
                        : 'user-series-list__toggle'
                    }
                    aria-pressed={sortOrder === 'favorite_asc'}
                    onClick={() => setSortOrder('favorite_asc')}
                  >
                    少ない順
                  </button>
                </div>
              </div>
            </header>
            {seriesActionError ? (
              <p className="user-series-list__status user-series-list__status--error">
                推し作品の更新に失敗しました。
              </p>
            ) : null}
            <div className="user-series-list__body">{renderSeriesList()}</div>
          </section>
        </div>
      )}

      {shouldShowRetry ? (
        <button type="button" className="user-series-page__retry" onClick={handleRetry}>
          再試行
        </button>
      ) : null}
    </main>
  )
}

export default UserOshiSeriesPage
