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

const renderLoadingSection = (title) => (
  <section className="user-oshi-sections__section" aria-live="polite">
    <header className="user-oshi-sections__header">
      <h2 className="user-oshi-sections__title">{title}</h2>
    </header>
    <p className="user-oshi-sections__status">読み込み中...</p>
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
  const canFetchVisibility =
    !isOwner &&
    typeof targetUserId === 'string' &&
    targetUserId.trim() !== '' &&
    visibilityProvider &&
    typeof visibilityProvider.fetchVisibility === 'function'
  const [visibility, setVisibility] = useState(buildPrivateVisibility)
  const [isLoading, setIsLoading] = useState(canFetchVisibility)

  useEffect(() => {
    let isMounted = true

    if (isOwner) {
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      setVisibility(buildPrivateVisibility())
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    if (!visibilityProvider || typeof visibilityProvider.fetchVisibility !== 'function') {
      setVisibility(buildPrivateVisibility())
      setIsLoading(false)
      return () => {
        isMounted = false
      }
    }

    const fetchVisibility = async () => {
      setIsLoading(true)
      setVisibility(buildPrivateVisibility())
      const result = await visibilityProvider.fetchVisibility({ targetUserId })
      if (!isMounted) return
      if (!result?.ok) {
        setVisibility(buildPrivateVisibility())
        setIsLoading(false)
        return
      }
      setVisibility({
        oshiList: normalizeVisibility(result.data?.oshiList),
        oshiSeries: normalizeVisibility(result.data?.oshiSeries),
      })
      setIsLoading(false)
    }

    fetchVisibility()

    return () => {
      isMounted = false
    }
  }, [isOwner, targetUserId, visibilityProvider])

  const shouldShowListPrivate = !isOwner && visibility.oshiList !== 'public'
  const shouldShowSeriesPrivate = !isOwner && visibility.oshiSeries !== 'public'
  const shouldShowLoading = !isOwner && isLoading

  return (
    <div className="user-oshi-sections">
      {shouldShowLoading
        ? renderLoadingSection('推しリスト')
        : shouldShowListPrivate
          ? renderPrivateSection('推しリスト')
          : listPanel}
      {shouldShowLoading
        ? renderLoadingSection('推し作品一覧')
        : shouldShowSeriesPrivate
          ? renderPrivateSection('推し作品一覧')
          : seriesPanel}
      {isOwner ? favoritesPanel : null}
    </div>
  )
}

export default UserOshiSections
