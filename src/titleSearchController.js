import { matchesTitle, normalizeTitleSearchText } from './titleSearchPolicy.js'

const buildInitialState = () => ({
  inputValue: '',
  appliedQuery: '',
  normalizedQuery: '',
  status: 'idle',
  error: null,
  results: [],
})

export const createTitleSearchController = ({
  dataProvider = null,
  normalize = normalizeTitleSearchText,
  matches = matchesTitle,
} = {}) => {
  let state = buildInitialState()
  let cachedItems = null

  const setState = (next) => {
    state = { ...state, ...next }
  }

  const clearSearch = () => {
    setState({
      appliedQuery: '',
      normalizedQuery: '',
      status: 'idle',
      error: null,
      results: [],
    })
  }

  const applySearch = async ({ dataProvider: providedDataProvider } = {}) => {
    const normalizedQuery = normalize(state.inputValue)
    if (!normalizedQuery) {
      clearSearch()
      return
    }

    setState({
      appliedQuery: state.inputValue,
      normalizedQuery,
      status: 'loading',
      error: null,
    })

    const activeProvider = providedDataProvider ?? dataProvider

    if (!cachedItems) {
      if (!activeProvider || typeof activeProvider.fetchAllItems !== 'function') {
        setState({
          status: 'error',
          error: 'not_configured',
          results: [],
        })
        return
      }

      const result = await activeProvider.fetchAllItems()
      if (!result?.ok) {
        setState({
          status: 'error',
          error: result?.error ?? 'unknown',
          results: [],
        })
        return
      }

      cachedItems = result.data ?? []
    }

    const results = cachedItems.filter((item) =>
      matches({ title: item?.title ?? '', query: normalizedQuery })
    )

    setState({
      status: 'active',
      error: null,
      results,
    })
  }

  return {
    get state() {
      return state
    },
    setInput(value) {
      const nextValue = value === null || value === undefined ? '' : String(value)
      setState({ inputValue: nextValue })
    },
    applySearch(options = {}) {
      return applySearch(options)
    },
    updateCachedItem(movieId, patch = {}) {
      if (!cachedItems) return
      cachedItems = cachedItems.map((item) =>
        item?.id === movieId ? { ...item, ...patch } : item
      )
    },
    clearSearch,
  }
}
