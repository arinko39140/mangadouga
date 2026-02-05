import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tokenPattern = /var\(--(color|font|space|shadow|radius)-/

const targetPages = [
  { label: 'TopPage', file: 'TopPage.css' },
  { label: 'OshiListsPage', file: 'OshiListsPage.css' },
  { label: 'WorkPage', file: 'WorkPage.css' },
  { label: 'HistoryPage', file: 'HistoryPage.css' },
]

describe('基盤UIトークン参照', () => {
  it('重点ページのCSSが共通トークンを参照している', () => {
    targetPages.forEach(({ label, file }) => {
      const css = readFileSync(resolve(__dirname, file), 'utf8')
      expect(css, `${label} should reference UI tokens`).toMatch(tokenPattern)
    })
  })
})
