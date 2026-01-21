import './UserOshiListPanel.css'

function UserOshiListPanel({
  summary,
  isLoading = false,
  error = null,
  isFavoriteUpdating = false,
  isAuthenticated = true,
  onToggleFavorite,
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
    !isFavoriteUpdating

  const favoriteLabel = summary?.isFavorited ? '登録済み' : 'お気に入り登録'

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
        <p className="user-oshi-list__count">
          お気に入り数: {summary?.favoriteCount ?? 0}
        </p>
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
        {!isAuthenticated ? (
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
