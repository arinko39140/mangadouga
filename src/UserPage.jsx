import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import ExternalLinksPanel from './ExternalLinksPanel.jsx'
import UserInfoPanel from './UserInfoPanel.jsx'
import UserOshiListPanel from './UserOshiListPanel.jsx'
import UserOshiSeriesPanel from './UserOshiSeriesPanel.jsx'
import { resolveCurrentUserId } from './supabaseSession.js'
import { supabase } from './supabaseClient.js'
import { createUserOshiListProvider } from './userOshiListProvider.js'
import { createUserPageProvider } from './userPageProvider.js'
import { createUserSeriesProvider } from './userSeriesProvider.js'
import './UserPage.css'

const defaultProfileProvider = createUserPageProvider(supabase)
const defaultListProvider = createUserOshiListProvider(supabase)
const defaultSeriesProvider = createUserSeriesProvider(supabase)

function UserPage({
  profileProvider = defaultProfileProvider,
  listProvider = defaultListProvider,
  seriesProvider = defaultSeriesProvider,
  authGate,
}) {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [listSummary, setListSummary] = useState(null)
  const [listError, setListError] = useState(null)
  const [listLoading, setListLoading] = useState(true)
  const [seriesItems, setSeriesItems] = useState([])
  const [seriesError, setSeriesError] = useState(null)
  const [seriesLoading, setSeriesLoading] = useState(true)
  const [favoriteError, setFavoriteError] = useState(null)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
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
      setListSummary(null)
      setListError(null)
      setListLoading(true)
      setSeriesItems([])
      setSeriesError(null)
      setSeriesLoading(true)
      setFavoriteError(null)
    }

    const fetchAll = async () => {
      if (!profileProvider || typeof profileProvider.fetchUserProfile !== 'function') {
        setProfileError('not_configured')
        setProfileLoading(false)
        setListLoading(false)
        setSeriesLoading(false)
        return
      }

      resetState()
      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok) {
        setIsAuthenticated(false)
        setProfileLoading(false)
        setListLoading(false)
        setSeriesLoading(false)
        authGateInstance.redirectToLogin()
        return
      }
      setIsAuthenticated(true)

      const viewerResult = await resolveCurrentUserId(supabase)
      if (!isMounted) return
      const viewerUserId = viewerResult.ok ? viewerResult.userId : null

      const profileResult = await profileProvider.fetchUserProfile(userId)
      if (!isMounted) return
      if (!profileResult.ok) {
        setProfileError(profileResult.error ?? 'unknown')
        setProfileLoading(false)
        setListLoading(false)
        setSeriesLoading(false)
        if (profileResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
        return
      }

      setProfile(profileResult.data)
      setProfileLoading(false)

      const listPromise =
        listProvider && typeof listProvider.fetchListSummary === 'function'
          ? listProvider.fetchListSummary({ targetUserId: userId, viewerUserId })
          : Promise.resolve({ ok: false, error: 'not_configured' })
      const seriesPromise =
        seriesProvider && typeof seriesProvider.fetchSeries === 'function'
          ? seriesProvider.fetchSeries(userId)
          : Promise.resolve({ ok: false, error: 'not_configured' })

      const [listResult, seriesResult] = await Promise.all([listPromise, seriesPromise])
      if (!isMounted) return

      if (listResult.ok) {
        setListSummary(listResult.data)
      } else {
        setListSummary(null)
        setListError(listResult.error ?? 'unknown')
        if (listResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
      }

      if (seriesResult.ok) {
        setSeriesItems(seriesResult.data)
      } else {
        setSeriesItems([])
        setSeriesError(seriesResult.error ?? 'unknown')
        if (seriesResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
      }

      setListLoading(false)
      setSeriesLoading(false)
    }

    fetchAll()

    return () => {
      isMounted = false
    }
  }, [
    authGateInstance,
    profileProvider,
    listProvider,
    seriesProvider,
    userId,
    reloadToken,
  ])

  const handleRetry = () => {
    setReloadToken((prev) => prev + 1)
  }

  const handleToggleFavorite = async () => {
    if (!listProvider || typeof listProvider.toggleFavorite !== 'function') return
    if (!listSummary?.listId) return

    setFavoriteError(null)
    const status = await authGateInstance.getStatus()
    if (!status.ok) {
      setIsAuthenticated(false)
      authGateInstance.redirectToLogin()
      return
    }
    setIsAuthenticated(true)

    setIsFavoriteUpdating(true)
    try {
      const result = await listProvider.toggleFavorite(listSummary.listId)
      if (result.ok) {
        setListSummary((prev) =>
          prev ? { ...prev, isFavorited: result.data.isFavorited } : prev
        )
      } else if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin()
      } else {
        setFavoriteError('failed')
      }
    } finally {
      setIsFavoriteUpdating(false)
    }
  }

  const hasPageError = Boolean(profileError)
  const isNotFound = profileError === 'not_found'
  const shouldShowRetry =
    (!isNotFound && Boolean(profileError)) || Boolean(listError) || Boolean(seriesError)

  const renderProfileError = () => {
    if (!profileError) return null
    const message = isNotFound
      ? 'ユーザーが見つかりません。'
      : 'ユーザー情報の取得に失敗しました。'
    return (
      <p className="user-page__status user-page__status--error" role="alert">
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

  return (
    <main className="user-page">
      <header className="user-page__header">
        <h1 className="user-page__title">ユーザーマイページ</h1>
        {profile?.name ? (
          <p className="user-page__subtitle">{profile.name}</p>
        ) : null}
      </header>

      {hasPageError ? (
        renderProfileError()
      ) : (
        <div className="user-page__sections">
          <UserInfoPanel profile={profile} isLoading={profileLoading} />
          {renderExternalLinks()}
          <UserOshiListPanel
            summary={listSummary}
            isLoading={listLoading}
            error={listError}
            isFavoriteUpdating={isFavoriteUpdating}
            isAuthenticated={isAuthenticated}
            onToggleFavorite={handleToggleFavorite}
          />
          {favoriteError ? (
            <p className="user-page__status user-page__status--error" role="alert">
              お気に入り操作に失敗しました。
            </p>
          ) : null}
          <UserOshiSeriesPanel
            items={seriesItems}
            isLoading={seriesLoading}
            error={seriesError}
            userId={userId}
          />
        </div>
      )}

      {shouldShowRetry ? (
        <button type="button" className="user-page__retry" onClick={handleRetry}>
          再試行
        </button>
      ) : null}
    </main>
  )
}

export default UserPage
