function EpisodeListItem({ episode }) {
  const publishedLabel = episode.publishedAt ?? '未設定'

  return (
    <div className="work-page__episode-card">
      <div className="work-page__episode-thumb">
        {episode.thumbnailUrl ? (
          <img src={episode.thumbnailUrl} alt={`${episode.title}のサムネイル`} />
        ) : (
          <span className="work-page__episode-thumb-placeholder">サムネイルなし</span>
        )}
      </div>
      <div className="work-page__episode-meta">
        <p className="work-page__episode-title">{episode.title}</p>
        <p className="work-page__episode-date">公開日: {publishedLabel}</p>
      </div>
    </div>
  )
}

export default EpisodeListItem
