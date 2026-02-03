import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PlaybackPanel from './PlaybackPanel.jsx'
import SortControl from './SortControl.jsx'
import {
  DEFAULT_SORT_ORDER,
  SORT_ORDER_QUERY_KEY,
  normalizeSortOrder,
} from './sortOrderPolicy.js'
import { supabase } from './supabaseClient.js'
import { createTitleSearchController } from './titleSearchController.js'
import { createWeekdayDataProvider } from './weekdayDataProvider.js'
import './TopPage.css'

const WEEKDAYS = [
  { key: 'all', label: 'すべて' },
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
const MAX_LIST_ITEMS = 100

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

const resolveTimestamp = (item) => {
  const time = Date.parse(item?.publishedAt ?? item?.update ?? '')
  return Number.isFinite(time) ? time : 0
}

const resolvePopularity = (item) =>
  Number.isFinite(item?.popularityScore) ? item.popularityScore : 0

const getYouTubeVideoId = (videoUrl) => {
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
    return id || null
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (pathname === '/watch') {
      return parsed.searchParams.get('v')
    }
    if (pathname.startsWith('/embed/')) {
      return pathname.split('/').filter(Boolean)[1] ?? null
    }
    if (pathname.startsWith('/shorts/')) {
      return pathname.split('/').filter(Boolean)[1] ?? null
    }
  }

  return null
}

const resolveThumbnailUrl = (item) => {
  if (item?.thumbnailUrl) return item.thumbnailUrl
  const videoId = getYouTubeVideoId(item?.detailPath)
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null
}

const formatSortLabel = (sortOrder) => {
  if (sortOrder === 'favorite_asc') return '人気(少ない順)'
  if (sortOrder === 'latest') return '投稿日(新しい順)'
  if (sortOrder === 'oldest') return '投稿日(古い順)'
  return '人気'
}

const sortItems = (items, sortOrder) => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    if (sortOrder === 'latest') {
      return resolveTimestamp(b) - resolveTimestamp(a)
    }
    if (sortOrder === 'oldest') {
      return resolveTimestamp(a) - resolveTimestamp(b)
    }
    const popularityDiff = resolvePopularity(b) - resolvePopularity(a)
    if (sortOrder === 'favorite_asc') {
      if (popularityDiff !== 0) return -popularityDiff
    } else if (popularityDiff !== 0) {
      return popularityDiff
    }
    return resolveTimestamp(b) - resolveTimestamp(a)
  })
  return sorted
}

const defaultWeekdayDataProvider = createWeekdayDataProvider(supabase)

const buildEmptyWeekdayLists = () =>
  WEEKDAYS.map((weekday) => ({
    weekday: weekday.key,
    items: [],
  }))

function TopPage({ dataProvider = defaultWeekdayDataProvider }) {
  const [selectedWeekday, setSelectedWeekday] = useState(getJstWeekdayKey)
  const [recentWeekday, setRecentWeekday] = useState('all')
  const [sortOrder, setSortOrder] = useState(DEFAULT_SORT_ORDER)
  const [weekdayLists, setWeekdayLists] = useState(buildEmptyWeekdayLists)
  const [recentItems, setRecentItems] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [, setSearchParams] = useSearchParams()
  const searchController = useMemo(
    () => createTitleSearchController({ dataProvider }),
    [dataProvider]
  )
  const [searchState, setSearchState] = useState(searchController.state)
  const isSearchApplied = searchState.status === 'active'
  const isAllSelected = selectedWeekday === 'all'
  const isAllRecent = recentWeekday === 'all'
  const selectedWeekdayLabel =
    WEEKDAYS.find((weekday) => weekday.key === selectedWeekday)?.label ?? ''
  const recentWeekdayLabel =
    WEEKDAYS.find((weekday) => weekday.key === recentWeekday)?.label ?? ''
  const selectedFilterLabel = isAllSelected
    ? 'すべて'
    : `${selectedWeekdayLabel}曜日`
  const selectedSortLabel = formatSortLabel(sortOrder)
  const selectedList = useMemo(() => {
    const items = isAllSelected
      ? weekdayLists.flatMap((list) => list.items)
      : weekdayLists.find((list) => list.weekday === selectedWeekday)?.items ?? []
    return sortItems(items, sortOrder).slice(0, MAX_LIST_ITEMS)
  }, [isAllSelected, selectedWeekday, sortOrder, weekdayLists])
  const recentListItems = useMemo(() => {
    return sortItems(recentItems, sortOrder).slice(0, MAX_LIST_ITEMS)
  }, [recentItems, sortOrder])
  const listTitle = isAllSelected
    ? 'すべての一覧'
    : `${selectedWeekdayLabel}曜日の一覧`
  const recentListTitle = isAllRecent
    ? 'すべての過去100件'
    : `${recentWeekdayLabel}曜日の過去100件`
  const playbackLabel = isAllSelected
    ? 'すべての人気動画を再生できます。'
    : `${selectedWeekdayLabel}曜日の人気動画を再生できます。`
  const featuredEpisode = selectedList[0]
    ? {
        id: selectedList[0].id,
        title: selectedList[0].title,
        videoUrl: selectedList[0].detailPath ?? null,
      }
    : null
  const handleSortChange = (nextSortOrder) => {
    setSortOrder(normalizeSortOrder(nextSortOrder))
  }
  const handleSearchInputChange = (event) => {
    searchController.setInput(event.target.value)
    setSearchState({ ...searchController.state })
  }
  const runSearch = async () => {
    const pending = searchController.applySearch({ dataProvider })
    setSearchState({ ...searchController.state })
    await pending
    setSearchState({ ...searchController.state })
  }
  const handleSearchSubmit = (event) => {
    event.preventDefault()
    void runSearch()
  }
  const handleSearchKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    void runSearch()
  }

  useEffect(() => {
    setSearchState(searchController.state)
  }, [searchController])

  useEffect(() => {
    setSearchParams((params) => {
      const nextParams = new URLSearchParams(params)
      nextParams.set(SORT_ORDER_QUERY_KEY, sortOrder)
      return nextParams
    }, { replace: true })
  }, [setSearchParams, sortOrder])

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError(null)
    const thresholdMs = buildWeekThresholdMs()

    dataProvider
      .fetchWeekdayLists()
      .then((result) => {
        if (!isMounted) return
        if (result.ok) {
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

  useEffect(() => {
    let isMounted = true

    if (!dataProvider || typeof dataProvider.fetchWeekdayItems !== 'function') {
      setRecentLoading(false)
      return () => {}
    }

    setRecentLoading(true)
    setRecentError(null)

    dataProvider
      .fetchWeekdayItems({ weekday: recentWeekday, sortOrder: 'latest', limit: 100 })
      .then((result) => {
        if (!isMounted) return
        if (result.ok) {
          setRecentItems(result.data.items ?? [])
        } else {
          setRecentItems([])
          setRecentError(result.error ?? 'unknown')
        }
      })
      .finally(() => {
        if (!isMounted) return
        setRecentLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [dataProvider, recentWeekday])

  return (
    <main className="top-page">
      <header className="top-page__header">
        <h1>トップページ</h1>
      </header>
      <div className="top-page__grid">
        <section className="top-page__playback" aria-label="動画再生">
          <h2>ピックアップ動画</h2>
          <p>{playbackLabel}</p>
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
          <p>{listTitle}</p>
          <div className="top-page__sort">
            <p className="top-page__sort-label">並び順: {selectedSortLabel}</p>
            <SortControl sortOrder={sortOrder} onChange={handleSortChange} />
          </div>
          <p className="top-page__filter-summary">
            表示中: {selectedFilterLabel} / {selectedSortLabel}
          </p>
          <form className="search top-page__search" onSubmit={handleSearchSubmit}>
            <label htmlFor="top-page-search-input">タイトル検索</label>
            <div className="top-page__search-controls">
              <input
                id="top-page-search-input"
                name="top-page-search-input"
                type="text"
                value={searchState.inputValue}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="タイトルで検索"
              />
              <button className="button button--ghost" type="submit">
                検索
              </button>
            </div>
          </form>
          {isSearchApplied ? (
            searchState.results.length === 0 ? (
              <p className="top-page__status">該当する結果がありません。</p>
            ) : (
              <ul className="top-page__list-items" aria-label="曜日別一覧のアイテム">
                {searchState.results.map((item) => (
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
            )
          ) : isLoading ? (
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
            <p className="top-page__status">
              {selectedFilterLabel}の一覧がありません。
            </p>
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
        <section
          className="top-page__recent top-page__list top-page__list--panel"
          aria-label="過去100件一覧"
        >
          <h2>過去100件の作品</h2>
          <div className="top-page__sort">
            <p className="top-page__sort-label">並び順: {selectedSortLabel}</p>
            <SortControl
              sortOrder={sortOrder}
              onChange={handleSortChange}
              label="過去100件の並び順"
            />
          </div>
          <div className="top-page__weekday" role="group" aria-label="過去100件の曜日">
            {WEEKDAYS.map((weekday) => (
              <button
                key={weekday.key}
                type="button"
                className={
                  weekday.key === recentWeekday
                    ? 'top-page__weekday-button is-selected'
                    : 'top-page__weekday-button'
                }
                aria-pressed={weekday.key === recentWeekday}
                onClick={() => setRecentWeekday(weekday.key)}
              >
                {weekday.label}
              </button>
            ))}
          </div>
          <p>{recentListTitle}</p>
          {recentLoading ? (
            <p className="top-page__status">読み込み中...</p>
          ) : recentError ? (
            <p className="top-page__status top-page__status--error">
              {recentError === 'not_configured'
                ? 'Supabaseの設定が不足しています。'
                : recentError === 'network'
                ? '通信エラーが発生しました。'
                : '不明なエラーが発生しました。'}
            </p>
          ) : recentListItems.length === 0 ? (
            <p className="top-page__status">
              {recentListTitle}がありません。
            </p>
          ) : (
            <ul
              className="top-page__list-items top-page__list-items--grid"
              aria-label="過去100件のアイテム"
            >
              {recentListItems.map((item) => (
                <li key={item.id} className="top-page__work-item">
                  <div className="top-page__work-card">
                    <div className="top-page__work-thumb">
                      {resolveThumbnailUrl(item) ? (
                        <img
                          src={resolveThumbnailUrl(item)}
                          alt={`${item.title}のサムネイル`}
                        />
                      ) : (
                        <span className="top-page__work-thumb-placeholder">
                          サムネイルなし
                        </span>
                      )}
                    </div>
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
                  </div>
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
