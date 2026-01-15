import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  const [loading, setLoading] = useState(true)

  const isAuthConfigured = Boolean(supabase?.auth?.getSession)
  const loginHref = useMemo(() => buildLoginLink(location), [location])

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
    return (
      <div className="app-shell__auth">
        <span className="app-shell__auth-user">{session.user.email ?? 'ログイン中'}</span>
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
      <div className="app-shell__content">{children}</div>
    </div>
  )
}

export default AppShell
