function FavoriteStarButton({ isFavorited, isLoading, onToggle }) {
  const statusLabel = isFavorited ? '登録済み' : '未登録'

  return (
    <button
      type="button"
      className="work-page__favorite"
      aria-pressed={Boolean(isFavorited)}
      onClick={onToggle}
      disabled={isLoading}
    >
      お気に入り: {statusLabel}
    </button>
  )
}

export default FavoriteStarButton
