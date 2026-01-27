import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createAuthGate } from './authGate.js'
import ExternalLinksPanel from './ExternalLinksPanel.jsx'
import UserInfoPanel from './UserInfoPanel.jsx'
import UserOshiFavoritesPanel from './UserOshiFavoritesPanel.jsx'
import UserOshiListPanel from './UserOshiListPanel.jsx'
import UserOshiSections from './UserOshiSections.jsx'
import UserOshiSeriesPanel from './UserOshiSeriesPanel.jsx'
import { createOshiFavoritesProvider } from './oshiFavoritesProvider.js'
import { resolveCurrentUserId } from './supabaseSession.js'
import { supabase } from './supabaseClient.js'
import { createUserOshiListProvider } from './userOshiListProvider.js'
import { createUserPageProvider } from './userPageProvider.js'
import { createUserSeriesProvider } from './userSeriesProvider.js'
import { publishUserProfileUpdated } from './userProfileEvents.js'
import './UserPage.css'

const defaultProfileProvider = createUserPageProvider(supabase)
const defaultListProvider = createUserOshiListProvider(supabase)
const defaultSeriesProvider = createUserSeriesProvider(supabase)
const defaultFavoritesProvider = createOshiFavoritesProvider(supabase)

function UserPage({
  profileProvider = defaultProfileProvider,
  listProvider = defaultListProvider,
  seriesProvider = defaultSeriesProvider,
  favoritesProvider = defaultFavoritesProvider,
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
  const [favoriteItems, setFavoriteItems] = useState([])
  const [favoriteSummaryError, setFavoriteSummaryError] = useState(null)
  const [favoriteSummaryLoading, setFavoriteSummaryLoading] = useState(true)
  const [favoriteError, setFavoriteError] = useState(null)
  const [isFavoriteUpdating, setIsFavoriteUpdating] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)
  const [viewerUserId, setViewerUserId] = useState(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState(null)
  const [profileForm, setProfileForm] = useState({
    name: '',
    iconUrl: '',
    xUrl: '',
    xLabel: '',
    youtubeUrl: '',
    youtubeLabel: '',
    otherUrl: '',
    otherLabel: '',
  })

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
      setFavoriteItems([])
      setFavoriteSummaryError(null)
      setFavoriteSummaryLoading(true)
      setFavoriteError(null)
      setViewerUserId(null)
    }

    const fetchAll = async () => {
      if (!profileProvider || typeof profileProvider.fetchUserProfile !== 'function') {
        setProfileError('not_configured')
        setProfileLoading(false)
        setListLoading(false)
        setSeriesLoading(false)
        setFavoriteSummaryLoading(false)
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
        setFavoriteSummaryLoading(false)
        authGateInstance.redirectToLogin()
        return
      }
      setIsAuthenticated(true)

      const viewerResult = await resolveCurrentUserId(supabase)
      if (!isMounted) return
      const resolvedViewerUserId = viewerResult.ok ? viewerResult.userId : null
      setViewerUserId(resolvedViewerUserId)
      const isOwner =
        typeof resolvedViewerUserId === 'string' && resolvedViewerUserId === userId

      const profileResult = await profileProvider.fetchUserProfile(userId)
      if (!isMounted) return
      if (!profileResult.ok) {
        setProfileError(profileResult.error ?? 'unknown')
        setProfileLoading(false)
        setListLoading(false)
        setSeriesLoading(false)
        setFavoriteSummaryLoading(false)
        if (profileResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
        return
      }

      setProfile(profileResult.data)
      setProfileLoading(false)

      if (!isEditingProfile) {
        setProfileForm({
          name: profileResult.data.name ?? '',
          iconUrl: profileResult.data.iconUrl ?? '',
          xUrl: profileResult.data.links?.find((link) => link.category === 'x')?.url ?? '',
          xLabel:
            profileResult.data.links?.find((link) => link.category === 'x')?.label ?? '',
          youtubeUrl:
            profileResult.data.links?.find((link) => link.category === 'youtube')?.url ?? '',
          youtubeLabel:
            profileResult.data.links?.find((link) => link.category === 'youtube')?.label ?? '',
          otherUrl:
            profileResult.data.links?.find((link) => link.category === 'other')?.url ?? '',
          otherLabel:
            profileResult.data.links?.find((link) => link.category === 'other')?.label ?? '',
        })
      }

      const listPromise =
        listProvider && typeof listProvider.fetchListSummary === 'function'
          ? listProvider.fetchListSummary({
              targetUserId: userId,
              viewerUserId: resolvedViewerUserId,
            })
          : Promise.resolve({ ok: false, error: 'not_configured' })
      const seriesPromise =
        seriesProvider && typeof seriesProvider.fetchSeriesSummary === 'function'
          ? seriesProvider.fetchSeriesSummary({
              targetUserId: userId,
              viewerUserId: resolvedViewerUserId,
              limit: 3,
            })
          : seriesProvider && typeof seriesProvider.fetchSeries === 'function'
            ? seriesProvider.fetchSeries(userId)
            : Promise.resolve({ ok: false, error: 'not_configured' })
      const favoritesPromise =
        isOwner &&
        favoritesProvider &&
        typeof favoritesProvider.fetchFavoritesSummary === 'function'
          ? favoritesProvider.fetchFavoritesSummary({
              viewerUserId: resolvedViewerUserId,
              limit: 3,
            })
          : Promise.resolve({ ok: true, data: [] })

      const [listResult, seriesResult, favoritesResult] = await Promise.all([
        listPromise,
        seriesPromise,
        favoritesPromise,
      ])
      if (!isMounted) return
      const resolvedFavoritesResult =
        favoritesResult && typeof favoritesResult === 'object'
          ? favoritesResult
          : { ok: false, error: 'unknown' }

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
        const resolvedItems = Array.isArray(seriesResult.data)
          ? seriesResult.data
          : seriesResult.data?.items ?? []
        setSeriesItems(resolvedItems)
      } else {
        setSeriesItems([])
        setSeriesError(seriesResult.error ?? 'unknown')
        if (seriesResult.error === 'auth_required') {
          authGateInstance.redirectToLogin()
        }
      }

      setListLoading(false)
      setSeriesLoading(false)
      if (isOwner) {
        if (resolvedFavoritesResult.ok) {
          setFavoriteItems(resolvedFavoritesResult.data ?? [])
        } else {
          setFavoriteItems([])
          setFavoriteSummaryError(resolvedFavoritesResult.error ?? 'unknown')
          if (resolvedFavoritesResult.error === 'auth_required') {
            authGateInstance.redirectToLogin()
          }
        }
        setFavoriteSummaryLoading(false)
      } else {
        setFavoriteItems([])
        setFavoriteSummaryError(null)
        setFavoriteSummaryLoading(false)
      }
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
    favoritesProvider,
    userId,
    reloadToken,
  ])

  const handleRetry = () => {
    setReloadToken((prev) => prev + 1)
  }

  const isOwner = Boolean(viewerUserId) && viewerUserId === userId

  const handleProfileChange = (field) => (event) => {
    const value = event?.target?.value ?? ''
    setProfileForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleProfileCancel = () => {
    setIsEditingProfile(false)
    setProfileSaveError(null)
    if (profile) {
      setProfileForm({
        name: profile.name ?? '',
        iconUrl: profile.iconUrl ?? '',
        xUrl: profile.links?.find((link) => link.category === 'x')?.url ?? '',
        xLabel: profile.links?.find((link) => link.category === 'x')?.label ?? '',
        youtubeUrl: profile.links?.find((link) => link.category === 'youtube')?.url ?? '',
        youtubeLabel: profile.links?.find((link) => link.category === 'youtube')?.label ?? '',
        otherUrl: profile.links?.find((link) => link.category === 'other')?.url ?? '',
        otherLabel: profile.links?.find((link) => link.category === 'other')?.label ?? '',
      })
    }
  }

  const handleProfileSave = async (event) => {
    event?.preventDefault?.()
    if (!profileProvider || typeof profileProvider.updateUserProfile !== 'function') {
      setProfileSaveError('not_configured')
      return
    }
    if (!viewerUserId) {
      setProfileSaveError('auth_required')
      authGateInstance.redirectToLogin()
      return
    }

    setProfileSaveError(null)
    setProfileSaving(true)
    const result = await profileProvider.updateUserProfile({
      userId: viewerUserId,
      name: profileForm.name,
      iconUrl: profileForm.iconUrl,
      xUrl: profileForm.xUrl,
      xLabel: profileForm.xLabel,
      youtubeUrl: profileForm.youtubeUrl,
      youtubeLabel: profileForm.youtubeLabel,
      otherUrl: profileForm.otherUrl,
      otherLabel: profileForm.otherLabel,
    })
    setProfileSaving(false)

    if (!result.ok) {
      if (result.error === 'auth_required') {
        authGateInstance.redirectToLogin()
      }
      setProfileSaveError(result.error ?? 'unknown')
      return
    }

    setIsEditingProfile(false)
    publishUserProfileUpdated()
    handleRetry()
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

  const listPanel = (
    <UserOshiListPanel
      summary={listSummary}
      isLoading={listLoading}
      error={listError}
      isFavoriteUpdating={isFavoriteUpdating}
      isAuthenticated={isAuthenticated}
      onToggleFavorite={handleToggleFavorite}
    />
  )
  const seriesPanel = (
    <UserOshiSeriesPanel
      items={seriesItems}
      isLoading={seriesLoading}
      error={seriesError}
      userId={userId}
    />
  )
  const favoritesPanel = (
    <UserOshiFavoritesPanel
      items={favoriteItems}
      isLoading={favoriteSummaryLoading}
      error={favoriteSummaryError}
    />
  )

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
          <UserInfoPanel
            profile={profile}
            isLoading={profileLoading}
            actions={
              isOwner ? (
                <button
                  type="button"
                  className="button button--ghost user-page__edit-button"
                  onClick={() => setIsEditingProfile(true)}
                >
                  プロフィール編集
                </button>
              ) : null
            }
          />
          {isOwner && isEditingProfile ? (
            <section className="user-profile-edit" aria-live="polite">
              <header className="user-profile-edit__header">
                <h2 className="user-profile-edit__title">プロフィール編集</h2>
              </header>
              <form className="form" onSubmit={handleProfileSave}>
                <label>
                  表示名
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={handleProfileChange('name')}
                    placeholder="ユーザー名"
                  />
                </label>
                <label>
                  アイコンURL
                  <input
                    type="url"
                    value={profileForm.iconUrl}
                    onChange={handleProfileChange('iconUrl')}
                    placeholder="https://..."
                  />
                </label>
                <label>
                  X URL
                  <input
                    type="url"
                    value={profileForm.xUrl}
                    onChange={handleProfileChange('xUrl')}
                    placeholder="https://x.com/..."
                  />
                </label>
                <label>
                  X 表示名
                  <input
                    type="text"
                    value={profileForm.xLabel}
                    onChange={handleProfileChange('xLabel')}
                    placeholder="X公式 など"
                  />
                </label>
                <label>
                  YouTube URL
                  <input
                    type="url"
                    value={profileForm.youtubeUrl}
                    onChange={handleProfileChange('youtubeUrl')}
                    placeholder="https://youtube.com/..."
                  />
                </label>
                <label>
                  YouTube 表示名
                  <input
                    type="text"
                    value={profileForm.youtubeLabel}
                    onChange={handleProfileChange('youtubeLabel')}
                    placeholder="YouTube公式 など"
                  />
                </label>
                <label>
                  その他URL
                  <input
                    type="url"
                    value={profileForm.otherUrl}
                    onChange={handleProfileChange('otherUrl')}
                    placeholder="https://..."
                  />
                </label>
                <label>
                  その他 表示名
                  <input
                    type="text"
                    value={profileForm.otherLabel}
                    onChange={handleProfileChange('otherLabel')}
                    placeholder="公式サイト など"
                  />
                </label>
                {profileSaveError ? (
                  <p className="user-profile-edit__status" role="alert">
                    プロフィールの更新に失敗しました。
                  </p>
                ) : null}
                <div className="form__actions">
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={profileSaving}
                  >
                    {profileSaving ? '更新中...' : '保存する'}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={handleProfileCancel}
                    disabled={profileSaving}
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </section>
          ) : null}
          {renderExternalLinks()}
          <UserOshiSections
            viewerUserId={viewerUserId}
            targetUserId={userId}
            listPanel={listPanel}
            seriesPanel={seriesPanel}
            favoritesPanel={favoritesPanel}
          />
          {favoriteError ? (
            <p className="user-page__status user-page__status--error" role="alert">
              お気に入り操作に失敗しました。
            </p>
          ) : null}
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
