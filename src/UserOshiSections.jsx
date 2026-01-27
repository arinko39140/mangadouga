import { useEffect, useState } from 'react'
import { createProfileVisibilityProvider } from './profileVisibilityProvider.js'
import { supabase } from './supabaseClient.js'
import './UserOshiSections.css'

const defaultVisibilityProvider = createProfileVisibilityProvider(supabase)

const buildPrivateVisibility = () => ({
  oshiList: 'private',
  oshiSeries: 'private',
})

const normalizeVisibility = (value) => (value === 'public' ? 'public' : 'private')

const renderPrivateSection = (title) => (
  <section
    className="user-oshi-sections__section user-oshi-sections__section--private"
    aria-live="polite"
  >
    <header className="user-oshi-sections__header">
      <h2 className="user-oshi-sections__title">{title}</h2>
    </header>
    <p className="user-oshi-sections__status">非公開</p>
  </section>
)

function UserOshiSections({
  viewerUserId = null,
  targetUserId = null,
  visibilityProvider = defaultVisibilityProvider,
  listPanel = null,
  seriesPanel = null,
  favoritesPanel = null,
}) {
  const isOwner = Boolean(viewerUserId) && viewerUserId === targetUserId
  const [visibility, setVisibility] = useState(buildPrivateVisibility)

  useEffect(() => {
    let isMounted = true

    if (isOwner) {
      return () => {
        isMounted = false
      }
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      setVisibility(buildPrivateVisibility())
      return () => {
        isMounted = false
      }
    }

    if (!visibilityProvider || typeof visibilityProvider.fetchVisibility !== 'function') {
      setVisibility(buildPrivateVisibility())
      return () => {
        isMounted = false
      }
    }

    const fetchVisibility = async () => {
      setVisibility(buildPrivateVisibility())
      const result = await visibilityProvider.fetchVisibility({ targetUserId })
      if (!isMounted) return
      if (!result?.ok) {
        setVisibility(buildPrivateVisibility())
        return
      }
      setVisibility({
        oshiList: normalizeVisibility(result.data?.oshiList),
        oshiSeries: normalizeVisibility(result.data?.oshiSeries),
      })
    }

    fetchVisibility()

    return () => {
      isMounted = false
    }
  }, [isOwner, targetUserId, visibilityProvider])

  const shouldShowListPrivate = !isOwner && visibility.oshiList !== 'public'
  const shouldShowSeriesPrivate = !isOwner && visibility.oshiSeries !== 'public'

  return (
    <div className="user-oshi-sections">
      {shouldShowListPrivate ? renderPrivateSection('推しリスト') : listPanel}
      {shouldShowSeriesPrivate ? renderPrivateSection('推し作品一覧') : seriesPanel}
      {isOwner ? favoritesPanel : null}
    </div>
  )
}

export default UserOshiSections
