import { Link } from 'react-router-dom'
import './UserOshiSeriesPanel.css'

function UserOshiSeriesPanel({
  items = [],
  isLoading = false,
  error = null,
  userId = null,
  visibility = 'public',
  navigateToMovie,
}) {
  const isPrivate = visibility === 'private'
  const handleNavigate = (event, seriesId) => {
    if (!seriesId || typeof navigateToMovie !== 'function') return
    event.preventDefault()
    navigateToMovie({ seriesId })
  }
  const renderContent = () => {
    if (isLoading) {
      return <p className="user-oshi-series__status">推し作品を読み込み中...</p>
    }
    if (error) {
      return (
        <p className="user-oshi-series__status user-oshi-series__status--error" role="alert">
          推し作品の取得に失敗しました。
        </p>
      )
    }
    if (isPrivate) {
      return <p className="user-oshi-series__status">この推し作品は非公開です。</p>
    }
    if (items.length === 0) {
      return <p className="user-oshi-series__status">推し作品がありません。</p>
    }

    return (
      <ul className="user-oshi-series__list" aria-label="推し作品一覧">
        {items.map((item) => (
          <li key={item.seriesId} className="user-oshi-series__item">
            <article className="user-oshi-series__card">
              <h3 className="user-oshi-series__title">
                {item.seriesId ? (
                  <Link
                    className="user-oshi-series__title-link"
                    to={`/series/${item.seriesId}/`}
                    onClick={(event) => handleNavigate(event, item.seriesId)}
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h3>
              {item.favoriteCount != null ? (
                <p className="user-oshi-series__meta">
                  お気に入り数: {item.favoriteCount}
                </p>
              ) : null}
              {item.seriesId ? (
                <div className="user-oshi-series__actions">
                  <Link
                    className="user-oshi-series__action"
                    to={`/series/${item.seriesId}/`}
                    onClick={(event) => handleNavigate(event, item.seriesId)}
                  >
                    作品ページへ
                  </Link>
                </div>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="user-oshi-series" aria-live="polite">
      <header className="user-oshi-series__header">
        <h2 className="user-oshi-series__title-heading">推し作品一覧</h2>
        {userId && !isPrivate ? (
          <Link className="user-oshi-series__link" to={`/users/${userId}/oshi-series/`}>
            もっと見る
          </Link>
        ) : null}
      </header>
      <div className="user-oshi-series__body">{renderContent()}</div>
    </section>
  )
}

export default UserOshiSeriesPanel
