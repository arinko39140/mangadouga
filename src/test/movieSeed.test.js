// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const seedPath = resolve(process.cwd(), 'supabase', 'seed.sql')

describe('movieテーブルのシードデータ', () => {
  it('7曜日すべてのサンプルが含まれている', () => {
    const sql = readFileSync(seedPath, 'utf-8')
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

    weekdays.forEach((weekday) => {
      expect(sql).toMatch(new RegExp(`\\b${weekday}\\b`))
    })
  })
})
