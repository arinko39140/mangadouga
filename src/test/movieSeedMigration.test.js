// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260113151000_seed_movie.sql'
)

describe('movieテーブルのシードマイグレーション', () => {
  it('7曜日すべてのサンプルを挿入している', () => {
    const sql = readFileSync(migrationPath, 'utf-8')
    const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

    expect(sql).toMatch(/insert into public\.movie/i)
    weekdays.forEach((weekday) => {
      expect(sql).toMatch(new RegExp(`\\b${weekday}\\b`))
    })
  })
})
