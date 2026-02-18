// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260303120000_movie_series_favorite_count_triggers.sql'
)

describe('favorite_countトリガーのマイグレーション', () => {
  it('movie と series の favorite_count 更新トリガーと再集計を定義している', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/recalculate_movie_favorite_count/i)
    expect(sql).toMatch(/movie_favorite_count_trigger/i)
    expect(sql).toMatch(/on public\.list_movie/i)

    expect(sql).toMatch(/recalculate_series_favorite_count/i)
    expect(sql).toMatch(/series_favorite_count_trigger/i)
    expect(sql).toMatch(/on public\.user_series/i)

    expect(sql).toMatch(/update public\.movie/i)
    expect(sql).toMatch(/update public\.series/i)
  })
})
