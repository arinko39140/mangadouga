import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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

const getJstWeekdayKey = () => {
  const jstDate = new Date(Date.now() + JST_OFFSET_MS)
  return JST_WEEKDAY_KEYS[jstDate.getUTCDay()]
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

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError(null)

    dataProvider
      .fetchWeekdayLists()
      .then((result) => {
        if (!isMounted) return
        if (result.ok) {
          setWeekdayLists(result.data)
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
          <p>推しリスト一覧への入口です。</p>
          <Link className="top-page__link-action" to="/oshi-lists/">
            推しリスト一覧へ
          </Link>
        </aside>
      </div>
    </main>
  )
}

export default TopPage
