import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { supabase } from './supabaseClient.js'

function HistoryPage({ authGate }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const ensureAuthenticated = async () => {
      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok) {
        authGateInstance.redirectToLogin()
        setIsLoading(false)
        return
      }
      setIsLoading(false)
    }

    ensureAuthenticated()

    return () => {
      isMounted = false
    }
  }, [authGateInstance])

  return (
    <main className="history-page">
      <h1>閲覧履歴</h1>
      {isLoading ? <p>読み込み中です。</p> : null}
    </main>
  )
}

export default HistoryPage
