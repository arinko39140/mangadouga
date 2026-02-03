export const SORT_ORDER_QUERY_KEY = 'sortOrder'
export const DEFAULT_SORT_ORDER = 'popular'

const LEGACY_TO_NORMALIZED = new Map([
  ['favorite_desc', DEFAULT_SORT_ORDER],
  ['popular_desc', DEFAULT_SORT_ORDER],
])

export const normalizeSortOrder = (value) => {
  if (value === 'favorite_asc') return 'favorite_asc'
  if (value === 'oldest') return 'oldest'
  if (value === 'latest') return 'latest'
  if (value === 'popular') return 'popular'
  if (value === 'popular_asc') return 'favorite_asc'
  if (LEGACY_TO_NORMALIZED.has(value)) {
    return LEGACY_TO_NORMALIZED.get(value)
  }
  return DEFAULT_SORT_ORDER
}
