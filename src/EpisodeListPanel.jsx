import EpisodeListItem from './EpisodeListItem.jsx'

function EpisodeListPanel({
  episodes = [],
  selectedEpisodeId = null,
  onSelectEpisode,
  isLoading = false,
  error = null,
}) {
  return (
    <div className="work-page__episode-panel">
      <p className="work-page__count">全{episodes.length}話</p>
      {isLoading ? (
        <p className="work-page__status">話数を読み込み中...</p>
      ) : error ? (
        <p className="work-page__status work-page__status--error">
          話数の取得に失敗しました。
        </p>
      ) : episodes.length === 0 ? (
        <p className="work-page__status">話数が存在しません。</p>
      ) : (
        <ul className="work-page__episode-list" aria-label="話数一覧のアイテム">
          {episodes.map((episode) => {
            const isSelected = episode.id === selectedEpisodeId
            return (
              <li key={episode.id} className="work-page__episode-item">
                <button
                  type="button"
                  className={
                    isSelected
                      ? 'work-page__episode-button is-selected'
                      : 'work-page__episode-button'
                  }
                  aria-pressed={isSelected}
                  onClick={() => onSelectEpisode?.(episode.id)}
                >
                  <EpisodeListItem episode={episode} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default EpisodeListPanel
