import { Link } from 'react-router-dom'
import './UserOshiFavoritesPanel.css'

function UserOshiFavoritesPanel({
  items = [],
  isLoading = false,
  error = null,
  isVisible = true,
}) {
  if (!isVisible) return null

  const renderContent = () => {
    if (isLoading) {
      return <p className="user-oshi-favorites__status">お気に入り推しリストを読み込み中...</p>
    }
    if (error) {
      return (
        <p className="user-oshi-favorites__status user-oshi-favorites__status--error" role="alert">
          お気に入り推しリストの取得に失敗しました。
        </p>
      )
    }
    if (items.length === 0) {
      return <p className="user-oshi-favorites__status">お気に入り推しリストがありません。</p>
    }

    return (
      <ul className="user-oshi-favorites__list" aria-label="お気に入り推しリスト">
        {items.map((item) => (
          <li key={item.listId} className="user-oshi-favorites__item">
            <div className="user-oshi-favorites__card">
              <p className="user-oshi-favorites__name">{item.name}</p>
              {item.favoriteCount != null ? (
                <p className="user-oshi-favorites__meta">お気に入り数: {item.favoriteCount}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="user-oshi-favorites" aria-live="polite">
      <header className="user-oshi-favorites__header">
        <h2 className="user-oshi-favorites__title">お気に入り推しリスト</h2>
        <Link className="user-oshi-favorites__link" to="/oshi-lists/favorites/">
          お気に入り推しリストを見る
        </Link>
      </header>
      <div className="user-oshi-favorites__body">{renderContent()}</div>
    </section>
  )
}

export default UserOshiFavoritesPanel
