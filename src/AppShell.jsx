import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { createUserPageProvider } from './userPageProvider.js'
import { subscribeUserProfileUpdated } from './userProfileEvents.js'
import { supabase } from './supabaseClient.js'
import './AppShell.css'

const buildLoginLink = (location) => {
  const redirect = `${location.pathname}${location.search}`
  return `/login/?redirect=${encodeURIComponent(redirect)}`
}

function AuthStatus() {
  const location = useLocation()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  const isAuthConfigured = Boolean(supabase?.auth?.getSession)
  const loginHref = useMemo(() => buildLoginLink(location), [location])
  const profileProvider = useMemo(() => createUserPageProvider(supabase), [])

  const fetchProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    if (!profileProvider || typeof profileProvider.fetchUserProfile !== 'function') {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    const result = await profileProvider.fetchUserProfile(userId)
    if (result.ok) {
      setProfile(result.data)
    } else {
      setProfile(null)
    }
    setProfileLoading(false)
  }, [profileProvider, session?.user?.id])

  useEffect(() => {
    if (!isAuthConfigured) {
      setLoading(false)
      return
    }
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data?.session ?? null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription?.subscription?.unsubscribe?.()
    }
  }, [isAuthConfigured])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    const unsubscribe = subscribeUserProfileUpdated(() => {
      fetchProfile()
    })
    return () => unsubscribe()
  }, [fetchProfile])

  const handleLogout = async () => {
    if (!supabase?.auth?.signOut) return
    await supabase.auth.signOut()
    navigate(location.pathname + location.search)
  }

  if (!isAuthConfigured) {
    return <p className="app-shell__auth-status">認証未設定</p>
  }

  if (loading) {
    return <p className="app-shell__auth-status">認証確認中...</p>
  }

  if (session?.user) {
    const userId = profile?.userId ?? session.user.id
    const displayName = profile?.name?.trim() || 'ユーザー'
    const showFallbackAvatar = !profile?.iconUrl

    return (
      <div className="app-shell__auth">
        <Link className="app-shell__auth-link" to={`/users/${userId}/`}>
          {profile?.iconUrl ? (
            <img
              className="app-shell__auth-avatar"
              src={profile.iconUrl}
              alt={`${displayName}のアイコン`}
              loading="lazy"
            />
          ) : (
            <span className="app-shell__auth-avatar app-shell__auth-avatar--fallback" aria-hidden>
              {showFallbackAvatar ? displayName.slice(0, 1) : ''}
            </span>
          )}
          <span className="app-shell__auth-user">
            {profileLoading ? '読み込み中...' : displayName}
          </span>
        </Link>
        <button className="app-shell__auth-button" type="button" onClick={handleLogout}>
          ログアウト
        </button>
      </div>
    )
  }

  return (
    <Link className="app-shell__auth-button" to={loginHref}>
      ログイン
    </Link>
  )
}

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="app-shell__brand" to="/">
          Manga Douga
        </Link>
        <AuthStatus />
      </header>
      <div className="app-shell__content motion-load">{children}</div>
    </div>
  )
}

export default AppShell
