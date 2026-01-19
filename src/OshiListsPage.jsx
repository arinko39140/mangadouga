import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import { createOshiListDataProvider } from './oshiListDataProvider.js'
import { supabase } from './supabaseClient.js'

const defaultDataProvider = createOshiListDataProvider(supabase)

function OshiListsPage({ dataProvider = defaultDataProvider, authGate }) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [errorType, setErrorType] = useState(null)
  const [items, setItems] = useState([])
  const authGateInstance = useMemo(() => {
    if (authGate) return authGate
    return createAuthGate({ supabaseClient: supabase, navigate })
  }, [authGate, navigate])

  useEffect(() => {
    let isMounted = true

    const fetchIfAuthenticated = async () => {
      if (!dataProvider || typeof dataProvider.fetchOshiList !== 'function') {
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
      const result = await dataProvider.fetchOshiList()
      if (!isMounted) return
      if (result.ok) {
        setItems(result.data)
      } else {
        setItems([])
        setErrorType(result.error?.type ?? 'unknown')
      }
      setIsLoading(false)
    }

    fetchIfAuthenticated()

    return () => {
      isMounted = false
    }
  }, [authGateInstance, dataProvider])

  const renderContent = () => {
    const visibleItems = items.filter((item) => item.isOshi)
    if (isLoading) {
      return <p>読み込み中です。</p>
    }
    if (errorType) {
      return <p role="alert">推し一覧の取得に失敗しました。</p>
    }
    if (visibleItems.length === 0) {
      return <p>登録済みの推しがありません。</p>
    }
    return (
      <ul>
        {visibleItems.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    )
  }

  return (
    <main>
      <h1>推しリスト</h1>
      {renderContent()}
    </main>
  )
}

export default OshiListsPage
