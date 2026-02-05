import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

describe('Contrast policy documentation', () => {
  it('defines WCAG AA 기준과対象/調整/測定ルール', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const docPath = resolve(__dirname, '../../docs/contrast-policy.md')
    const doc = readFileSync(docPath, 'utf8')

    expect(doc).toContain('WCAG 2.1 AA')
    expect(doc).toContain('本文')
    expect(doc).toContain('補足')
    expect(doc).toContain('見出し')
    expect(doc).toContain('ボタン')
    expect(doc).toContain('リンク')
    expect(doc).toContain('フォーカスリング')
    expect(doc).toContain('低コントラスト')
    expect(doc).toContain('測定方法')
    expect(doc).toContain('記録フォーマット')
  })
})
