import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import ExternalLinksPanel from './ExternalLinksPanel.jsx'
import UserInfoPanel from './UserInfoPanel.jsx'
import { createProfileVisibilityProvider } from './profileVisibilityProvider.js'
import { resolveCurrentUserId } from './supabaseSession.js'
import { supabase } from './supabaseClient.js'
import { createUserPageProvider } from './userPageProvider.js'
import { createUserSeriesProvider } from './userSeriesProvider.js'
import './UserOshiSeriesPage.css'

const defaultProfileProvider = createUserPageProvider(supabase)
const defaultSeriesProvider = createUserSeriesProvider(supabase)
const defaultVisibilityProvider = createProfileVisibilityProvider(supabase)

const normalizeVisibility = (value) => (value === 'public' ? 'public' : 'private')
const viewModes = [
  { id: 'grid', label: 'グリッド' },
  { id: 'list', label: 'リスト' },
]

function UserOshiSeriesPage({
  profileProvider = defaultProfileProvider,
  seriesProvider = defaultSeriesProvider,
  visibilityProvider = defaultVisibilityProvider,
  authGate,
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
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

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
              sort: null,
            })
          : { ok: false, error: 'not_configured' }

      if (!isMounted) return

      if (seriesResult.ok) {
        setSeriesItems(seriesResult.data)
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
  ])

  const handleRetry = () => {
    setReloadToken((prev) => prev + 1)
  }

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

  const renderSeriesList = () => {
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
                    <Link to={`/series/${item.seriesId}/`}>{item.title}</Link>
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
                    <Link className="user-series-list__link" to={`/series/${item.seriesId}/`}>
                      作品ページへ
                    </Link>
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
            </header>
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
