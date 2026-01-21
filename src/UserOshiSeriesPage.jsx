import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import ExternalLinksPanel from './ExternalLinksPanel.jsx'
import UserInfoPanel from './UserInfoPanel.jsx'
import UserOshiSeriesPanel from './UserOshiSeriesPanel.jsx'
import { supabase } from './supabaseClient.js'
import { createUserPageProvider } from './userPageProvider.js'
import { createUserSeriesProvider } from './userSeriesProvider.js'
import './UserOshiSeriesPage.css'

const defaultProfileProvider = createUserPageProvider(supabase)
const defaultSeriesProvider = createUserSeriesProvider(supabase)

function UserOshiSeriesPage({
  profileProvider = defaultProfileProvider,
  seriesProvider = defaultSeriesProvider,
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

      const seriesResult =
        seriesProvider && typeof seriesProvider.fetchSeries === 'function'
          ? await seriesProvider.fetchSeries(userId)
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
  }, [authGateInstance, profileProvider, seriesProvider, userId, reloadToken])

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
          <UserOshiSeriesPanel
            items={seriesItems}
            isLoading={seriesLoading}
            error={seriesError}
            userId={userId}
          />
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
