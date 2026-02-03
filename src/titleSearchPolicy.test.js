import { describe, expect, it } from 'vitest'
import { matchesTitle, normalizeTitleSearchText } from './titleSearchPolicy.js'

describe('titleSearchPolicy', () => {
  it.each([
    ['  Example Title  ', 'example title'],
    ['EXAMPLE   TITLE', 'example title'],
    ['　Example　　Title　', 'example title'],
  ])('正規化で空白整形と小文字化を行う (%s)', (input, expected) => {
    expect(normalizeTitleSearchText(input)).toBe(expected)
  })

  it('全角英数字を半角に正規化する', () => {
    expect(normalizeTitleSearchText('ＡＢＣ１２３')).toBe('abc123')
  })

  it.each([
    { title: 'My Hero Academia', query: 'hero', expected: true },
    { title: 'My Hero Academia', query: 'HERO', expected: true },
    { title: '僕のヒーローアカデミア', query: 'ヒーロー', expected: true },
    { title: 'にじさんじ', query: 'ホロライブ', expected: false },
  ])('正規化後の部分一致で判定する', ({ title, query, expected }) => {
    expect(matchesTitle({ title, query })).toBe(expected)
  })

  it('空クエリは一致しない', () => {
    expect(matchesTitle({ title: 'Example', query: '   ' })).toBe(false)
  })
})
