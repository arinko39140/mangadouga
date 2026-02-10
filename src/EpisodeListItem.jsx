import { useInViewMotion } from './hooks/useInViewMotion.js'

const buildMotionClassName = (baseClassName, motionState) => {
  if (motionState.shouldReduceMotion) return baseClassName
  return `${baseClassName} motion-appear${motionState.isInView ? ' is-inview' : ''}`
}

function EpisodeListItem({ episode, isSelected = false, onSelect, onToggleOshi }) {
  const motion = useInViewMotion()
  const publishedLabel = episode.publishedAt ?? '未設定'

  return (
    <div
      ref={motion.ref}
      className={buildMotionClassName(
        'work-page__episode-card card-primary card-interactive motion-hover',
        motion
      )}
    >
      <button
        type="button"
        className={
          isSelected ? 'work-page__episode-button is-selected' : 'work-page__episode-button'
        }
        aria-pressed={isSelected}
        aria-label={episode.title}
        onClick={() => onSelect?.(episode.id)}
      >
        <div className="work-page__episode-thumb">
          {episode.thumbnailUrl ? (
            <img src={episode.thumbnailUrl} alt={`${episode.title}のサムネイル`} />
          ) : (
            <span className="work-page__episode-thumb-placeholder media-text">
              サムネイルなし
            </span>
          )}
        </div>
        <div className="work-page__episode-meta">
          <p className="work-page__episode-title text-strong">{episode.title}</p>
          <p className="work-page__episode-date">公開日: {publishedLabel}</p>
        </div>
      </button>
      <button
        type="button"
        className={
          episode.isOshi
            ? 'work-page__oshi-button work-page__oshi-button--overlay oshi-lists__oshi-button is-registered'
            : 'work-page__oshi-button work-page__oshi-button--overlay oshi-lists__oshi-button'
        }
        aria-pressed={episode.isOshi}
        onClick={() => onToggleOshi?.(episode.id)}
      >
        {episode.isOshi ? '済' : '推'}
      </button>
    </div>
  )
}

export default EpisodeListItem
