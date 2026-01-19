import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createOshiListDataProvider } from './oshiListDataProvider.js'
import { supabase } from './supabaseClient.js'

const defaultDataProvider = createOshiListDataProvider(supabase)

function OshiListsPage({ dataProvider = defaultDataProvider, authGate }) {
  const navigate = useNavigate()
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      if (!dataProvider || typeof dataProvider.fetchOshiList !== 'function') return
      const status = await authGateInstance.getStatus()
      if (!isMounted) return
      if (!status.ok) {
        authGateInstance.redirectToLogin()
        return
      }
      await dataProvider.fetchOshiList()
    }

    fetchIfAuthenticated()

    return () => {
      isMounted = false
    }
  }, [authGateInstance, dataProvider])

  return (
    <main>
      <h1>推しリスト</h1>
      <p>推しリスト一覧は準備中です。</p>
    </main>
  )
}

export default OshiListsPage
