// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260113150000_create_movie.sql'
)

describe('movieテーブルのマイグレーション', () => {
  it('曜日・人気数・更新日時の列を持つmovieテーブルを定義している', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/create table if not exists public\.movie/i)
    expect(sql).toMatch(/\bweekday\b/i)
    expect(sql).toMatch(/\bfavorite_count\b/i)
    expect(sql).toMatch(/"update"/i)
  })
})
