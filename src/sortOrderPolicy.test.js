import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SORT_ORDER,
  SORT_ORDER_QUERY_KEY,
  normalizeSortOrder,
} from './sortOrderPolicy.js'

describe('sortOrderPolicy', () => {
  it('デフォルト値とURLキーを提供する', () => {
    expect(DEFAULT_SORT_ORDER).toBe('popular')
    expect(SORT_ORDER_QUERY_KEY).toBe('sortOrder')
  })

  it.each([
    ['popular', 'popular'],
    ['latest', 'latest'],
    ['favorite_desc', 'popular'],
    ['favorite_asc', 'favorite_asc'],
    ['oldest', 'oldest'],
    ['popular_asc', 'favorite_asc'],
    ['invalid', 'popular'],
    [undefined, 'popular'],
    [null, 'popular'],
  ])('sortOrderを正規化する (%s)', (input, expected) => {
    expect(normalizeSortOrder(input)).toBe(expected)
  })
})
