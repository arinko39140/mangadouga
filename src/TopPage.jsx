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

function TopPage() {
  const selectedWeekday = 'mon'

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
              >
                {weekday.label}
              </button>
            ))}
          </div>
          <p>曜日を選ぶと一覧が切り替わります。</p>
        </nav>
        <section className="top-page__list" aria-label="曜日別一覧">
          <h2>曜日別一覧</h2>
          <p>ここに曜日別の一覧が表示されます。</p>
        </section>
        <aside className="top-page__link" aria-label="推しリスト導線">
          <h2>推しリスト導線</h2>
          <p>推しリスト一覧への入口です。</p>
        </aside>
      </div>
    </main>
  )
}

export default TopPage
