const buildYouTubeEmbedUrl = (videoUrl) => {
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
    return id ? `https://www.youtube.com/embed/${id}` : null
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (pathname === '/watch') {
      const id = parsed.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (pathname.startsWith('/embed/')) {
      const id = pathname.split('/').filter(Boolean)[1]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }

    if (pathname.startsWith('/shorts/')) {
      const id = pathname.split('/').filter(Boolean)[1]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
  }

  return null
}

function PlaybackPanel({ episode, isLoading, onPlay }) {
  if (isLoading) {
    return <p className="work-page__status">再生準備中...</p>
  }

  if (!episode) {
    return <p className="work-page__status">話数が選択されていません。</p>
  }

  if (!episode.videoUrl) {
    return <p className="work-page__status">動画URLが未設定です。</p>
  }

  const embedUrl = buildYouTubeEmbedUrl(episode.videoUrl)

  if (!embedUrl) {
    return (
      <div className="work-page__playback-fallback">
        <p className="work-page__status">対応していない動画URLです。</p>
        <a
          className="work-page__playback-link"
          href={episode.videoUrl}
          target="_blank"
          rel="noreferrer"
        >
          元の動画を開く
        </a>
      </div>
    )
  }

  return (
    <div className="work-page__player">
      {typeof onPlay === 'function' ? (
        <button
          type="button"
          className="work-page__play-button"
          onClick={() => onPlay(episode)}
        >
          再生する
        </button>
      ) : null}
      <iframe
        title={`再生中: ${episode.title}`}
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export default PlaybackPanel
