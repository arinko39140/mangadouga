import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PlaybackPanel from './PlaybackPanel.jsx'
import { supabase } from './supabaseClient.js'
import { createWeekdayDataProvider } from './weekdayDataProvider.js'
import './TopPage.css'

const WEEKDAYS = [
  { key: 'mon', label: '月' },
  { key: 'tue', label: '火' },
  { key: 'wed', label: '水' },
  { key: 'thu', label: '木' },
  { key: 'fri', label: '金' },
  { key: 'sat', label: '土' },
  { key: 'sun', label: '日' },
]

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const JST_WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const WEEK_RANGE_MS = 7 * 24 * 60 * 60 * 1000

const getJstWeekdayKey = () => {
  const jstDate = new Date(Date.now() + JST_OFFSET_MS)
  return JST_WEEKDAY_KEYS[jstDate.getUTCDay()]
}

const buildWeekThresholdMs = () => Date.now() - WEEK_RANGE_MS

const isWithinWeekRange = (item, thresholdMs) => {
  const publishedAt = item?.publishedAt ?? item?.update
  const time = Date.parse(publishedAt)
  if (!Number.isFinite(time)) return false
  return time >= thresholdMs
}

const defaultWeekdayDataProvider = createWeekdayDataProvider(supabase)

const buildEmptyWeekdayLists = () =>
  WEEKDAYS.map((weekday) => ({
    weekday: weekday.key,
    items: [],
  }))

function TopPage({ dataProvider = defaultWeekdayDataProvider }) {
  const [selectedWeekday, setSelectedWeekday] = useState(getJstWeekdayKey)
  const [weekdayLists, setWeekdayLists] = useState(buildEmptyWeekdayLists)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const selectedWeekdayLabel =
    WEEKDAYS.find((weekday) => weekday.key === selectedWeekday)?.label ?? ''
  const selectedList =
    weekdayLists.find((list) => list.weekday === selectedWeekday)?.items ?? []
  const featuredEpisode = selectedList[0]
    ? {
        id: selectedList[0].id,
        title: selectedList[0].title,
        videoUrl: selectedList[0].detailPath ?? null,
      }
    : null

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError(null)

    dataProvider
      .fetchWeekdayLists()
      .then((result) => {
        if (!isMounted) return
        if (result.ok) {
          const thresholdMs = buildWeekThresholdMs()
          const filteredLists = result.data.map((list) => ({
            ...list,
            items: list.items.filter((item) => isWithinWeekRange(item, thresholdMs)),
          }))
          setWeekdayLists(filteredLists)
        } else {
          setError(result.error)
        }
      })
      .finally(() => {
        if (!isMounted) return
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [dataProvider])

  return (
    <main className="top-page">
      <header className="top-page__header">
        <h1>トップページ</h1>
      </header>
      <div className="top-page__grid">
        <section className="top-page__playback" aria-label="動画再生">
          <h2>ピックアップ動画</h2>
          <p>{selectedWeekdayLabel}曜日の人気動画を再生できます。</p>
          {isLoading ? (
            <p className="top-page__status">再生準備中...</p>
          ) : featuredEpisode ? (
            <PlaybackPanel episode={featuredEpisode} isLoading={false} />
          ) : (
            <p className="top-page__status">再生できる動画がありません。</p>
          )}
        </section>
        <nav className="top-page__nav" aria-label="曜日ナビゲーション">
          <h2>曜日ナビゲーション</h2>
          <div className="top-page__weekday">
            {WEEKDAYS.map((weekday) => (
              <button
                key={weekday.key}
                type="button"
                className={
                  weekday.key === selectedWeekday
                    ? 'top-page__weekday-button is-selected'
                    : 'top-page__weekday-button'
                }
                aria-pressed={weekday.key === selectedWeekday}
                onClick={() => setSelectedWeekday(weekday.key)}
              >
                {weekday.label}
              </button>
            ))}
          </div>
          <p>曜日を選ぶと一覧が切り替わります。</p>
        </nav>
        <section className="top-page__list top-page__list--panel" aria-label="曜日別一覧">
          <h2>曜日別一覧</h2>
          <p>{selectedWeekdayLabel}曜日の一覧</p>
          {isLoading ? (
            <p className="top-page__status">読み込み中...</p>
          ) : error ? (
            <p className="top-page__status top-page__status--error">
              {error === 'not_configured'
                ? 'Supabaseの設定が不足しています。'
                : error === 'network'
                ? '通信エラーが発生しました。'
                : '不明なエラーが発生しました。'}
            </p>
          ) : selectedList.length === 0 ? (
            <p className="top-page__status">表示できる一覧がありません。</p>
          ) : (
            <ul className="top-page__list-items" aria-label="曜日別一覧のアイテム">
              {selectedList.map((item) => (
                <li key={item.id} className="top-page__work-item">
                  {item.seriesId ? (
                    <Link
                      className="top-page__work-link"
                      to={`/series/${item.seriesId}/`}
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <span className="top-page__work-title">{item.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside className="top-page__link top-page__link--cta" aria-label="推しリスト導線">
          <h2>推しリスト導線</h2>
          <p>みんなの推しリスト一覧への入口です。</p>
          <Link className="top-page__link-action" to="/oshi-lists/catalog/">
            みんなの推しリスト一覧へ
          </Link>
          <Link className="top-page__link-action" to="/oshi-lists/">
            推しリストへ
          </Link>
        </aside>
      </div>
    </main>
  )
}

export default TopPage
