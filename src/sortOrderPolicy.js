export const SORT_ORDER_QUERY_KEY = 'sortOrder'
export const DEFAULT_SORT_ORDER = 'popular'

const LEGACY_TO_NORMALIZED = new Map([
  ['favorite_desc', DEFAULT_SORT_ORDER],
  ['favorite_asc', DEFAULT_SORT_ORDER],
  ['oldest', DEFAULT_SORT_ORDER],
])

export const normalizeSortOrder = (value) => {
  if (value === 'latest') return 'latest'
  if (value === 'popular') return 'popular'
  if (LEGACY_TO_NORMALIZED.has(value)) {
    return LEGACY_TO_NORMALIZED.get(value)
  }
  return DEFAULT_SORT_ORDER
}
