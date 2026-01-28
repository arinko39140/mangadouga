import { Link } from 'react-router-dom'
import './UserOshiListPanel.css'

function UserOshiListPanel({
  summary,
  isLoading = false,
  error = null,
  isFavoriteUpdating = false,
  isAuthenticated = true,
  onToggleFavorite,
  isOwner = false,
}) {
  const status = summary?.status ?? null
  const isPublic = status === 'public'
  const isPrivate = status === 'private'
  const isEmpty = status === 'none'
  const isNotFound = status === 'not_found'

  const canToggleFavorite =
    Boolean(onToggleFavorite) &&
    isAuthenticated &&
    isPublic &&
    Boolean(summary?.listId) &&
    !isOwner &&
    !isFavoriteUpdating

  const listId = summary?.listId ?? null
  const canViewList = isPublic && Boolean(listId)
  const favoriteLabel = summary?.isFavorited ? '登録済み' : 'お気に入り登録'
  const items = Array.isArray(summary?.items) ? summary.items : []

  const getYouTubeVideoId = (videoUrl) => {
    if (!videoUrl) return null

    let parsed
    try {
      parsed = new URL(videoUrl)
    } catch {
      return null
    }

    const hostname = parsed.hostname.replace(/^www\./, '')
    const pathname = parsed.pathname

    if (hostname === 'youtu.be') {
      const id = pathname.split('/').filter(Boolean)[0]
      return id || null
    }

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (pathname === '/watch') {
        return parsed.searchParams.get('v')
      }

      if (pathname.startsWith('/embed/')) {
        return pathname.split('/').filter(Boolean)[1] ?? null
      }

      if (pathname.startsWith('/shorts/')) {
        return pathname.split('/').filter(Boolean)[1] ?? null
      }
    }

    return null
  }

  const resolveThumbnailUrl = (item) => {
    if (item.thumbnailUrl) return item.thumbnailUrl
    const videoId = getYouTubeVideoId(item.videoUrl)
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
  }

  const renderContent = () => {
    if (isLoading) {
      return <p className="user-oshi-list__status">推しリストを読み込み中...</p>
    }
    if (error) {
      return (
        <p className="user-oshi-list__status user-oshi-list__status--error" role="alert">
          推しリストの取得に失敗しました。
        </p>
      )
    }
    if (isNotFound) {
      return (
        <p className="user-oshi-list__status user-oshi-list__status--error" role="alert">
          推しリストを表示できません。
        </p>
      )
    }
    if (isPrivate) {
      return <p className="user-oshi-list__status">この推しリストは非公開です。</p>
    }
    if (isEmpty || !status) {
      return <p className="user-oshi-list__status">推しリストがありません。</p>
    }

    return (
      <div className="user-oshi-list__summary">
        {items.length > 0 ? (
          <div className="user-oshi-list__items">
            <p className="user-oshi-list__items-title">最近追加した推し動画</p>
            <ul className="user-oshi-list__items-list" aria-label="推しリストの最近追加した動画">
              {items.map((item) => (
                <li key={item.movieId} className="user-oshi-list__items-item">
                  {(() => {
                    const thumbnailUrl = resolveThumbnailUrl(item)
                    const content = (
                      <>
                        <div className="user-oshi-list__thumb">
                          {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt={`${item.title}のサムネイル`} />
                          ) : (
                            <span className="user-oshi-list__thumb-placeholder">
                              サムネイル準備中
                            </span>
                          )}
                        </div>
                        <p className="user-oshi-list__item-title">{item.title}</p>
                      </>
                    )

                    return canViewList ? (
                      <Link
                        className="user-oshi-list__item-link"
                        to={`/oshi-lists/${listId}/`}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="user-oshi-list__item-card">{content}</div>
                    )
                  })()}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {summary?.favoriteCount != null ? (
          <p className="user-oshi-list__count">お気に入り数: {summary.favoriteCount}</p>
        ) : null}
        {!isOwner ? (
          <button
            type="button"
            className={
              summary?.isFavorited
                ? 'user-oshi-list__favorite-button is-active'
                : 'user-oshi-list__favorite-button'
            }
            aria-pressed={summary?.isFavorited ? 'true' : 'false'}
            disabled={!canToggleFavorite}
            onClick={canToggleFavorite ? onToggleFavorite : undefined}
          >
            {favoriteLabel}
          </button>
        ) : null}
        {canViewList ? (
          <Link className="user-oshi-list__link" to={`/oshi-lists/${listId}/`}>
            推しリストを見る
          </Link>
        ) : null}
        {!isAuthenticated && !isOwner ? (
          <p className="user-oshi-list__note">ログインするとお気に入り登録できます。</p>
        ) : null}
      </div>
    )
  }

  return (
    <section className="user-oshi-list" aria-live="polite">
      <header className="user-oshi-list__header">
        <h2 className="user-oshi-list__title">推しリスト</h2>
      </header>
      <div className="user-oshi-list__body">{renderContent()}</div>
    </section>
  )
}

export default UserOshiListPanel
