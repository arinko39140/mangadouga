import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient.js'
import './LoginPage.css'

const resolveRedirectTarget = (search) => {
  const params = new URLSearchParams(search)
  const redirect = params.get('redirect')
  if (!redirect || !redirect.startsWith('/')) {
    return '/'
  }
  return redirect
}

function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const redirectTarget = useMemo(
    () => resolveRedirectTarget(location.search),
    [location.search]
  )

  const isAuthConfigured = Boolean(supabase?.auth?.getSession)

  useEffect(() => {
    if (!isAuthConfigured) return
    let isMounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      if (data?.session?.user) {
        navigate(redirectTarget, { replace: true })
      }
    })
    return () => {
      isMounted = false
    }
  }, [isAuthConfigured, navigate, redirectTarget])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!isAuthConfigured) {
      setError('認証設定が未構成のため、ログインできません。')
      return
    }
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) {
          setError('登録に失敗しました。入力内容をご確認ください。')
          return
        }
        if (!data?.session) {
          setNotice('確認メールを送信しました。メール内リンクで登録を完了してください。')
          return
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError('ログインに失敗しました。入力内容をご確認ください。')
          return
        }
      }

      navigate(redirectTarget, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-label="ログインフォーム">
        <div className="login-card__header">
          <p className="login-card__eyebrow">Manga Douga</p>
          <h1 className="login-card__title">
            {mode === 'signup' ? '新規登録' : 'ログイン'}
          </h1>
          <p className="login-card__lead">
            推し登録やお気に入り操作にはアカウントが必要です。
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-form__field">
            <span>メールアドレス</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              disabled={!isAuthConfigured || loading}
            />
          </label>
          <label className="login-form__field">
            <span>パスワード</span>
            <input
              type="password"
              name="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8文字以上"
              required
              disabled={!isAuthConfigured || loading}
            />
          </label>

          {error && <p className="login-form__status is-error">{error}</p>}
          {notice && <p className="login-form__status">{notice}</p>}
          {!isAuthConfigured && (
            <p className="login-form__status is-error">
              Supabaseの認証情報が未設定です。`.env`に`VITE_SUPABASE_URL`と
              `VITE_SUPABASE_ANON_KEY`を設定してください。
            </p>
          )}

          <button className="login-form__submit" type="submit" disabled={loading}>
            {loading ? '処理中...' : mode === 'signup' ? '登録する' : 'ログインする'}
          </button>

          <button
            className="login-form__toggle"
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup')
              setError('')
              setNotice('')
            }}
            disabled={loading}
          >
            {mode === 'signup' ? 'ログインはこちら' : '新規登録はこちら'}
          </button>
        </form>

        <div className="login-card__footer">
          <Link className="login-card__link" to="/">
            トップページへ戻る
          </Link>
        </div>
      </section>
    </main>
  )
}

export default LoginPage
