export const createNavigateToMovie = ({
  navigate,
  historyRecorder,
  now = () => new Date().toISOString(),
} = {}) => {
  return async ({ seriesId, movieId } = {}) => {
    if (!seriesId || typeof navigate !== 'function') return

    const resolvedMovieId = typeof movieId === 'string' ? movieId.trim() : ''

    if (resolvedMovieId && typeof historyRecorder?.recordView === 'function') {
      try {
        await historyRecorder.recordView({
          movieId: resolvedMovieId,
          clickedAt: now(),
          source: 'navigate',
        })
      } catch (error) {
        // 記録失敗でも遷移は継続する
      }
    }

    const targetPath = resolvedMovieId
      ? `/series/${seriesId}/?selectedMovieId=${resolvedMovieId}`
      : `/series/${seriesId}/`

    navigate(targetPath)
  }
}
