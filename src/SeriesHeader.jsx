function SeriesHeader({ title, isLoading, error }) {
  if (isLoading) {
    return <p className="work-page__status">作品情報を読み込み中...</p>
  }

  if (error) {
    return (
      <p className="work-page__status work-page__status--error">
        作品情報の取得に失敗しました。
      </p>
    )
  }

  return <p className="work-page__title">{title ?? '作品が見つかりません。'}</p>
}

export default SeriesHeader
