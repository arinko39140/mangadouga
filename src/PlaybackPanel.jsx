function PlaybackPanel({ episode, isLoading }) {
  if (isLoading) {
    return <p className="work-page__status">再生準備中...</p>
  }

  if (!episode) {
    return <p className="work-page__status">話数が選択されていません。</p>
  }

  if (!episode.videoUrl) {
    return <p className="work-page__status">動画URLが未設定です。</p>
  }

  return <p className="work-page__playback-title">再生中: {episode.title}</p>
}

export default PlaybackPanel
