// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260303123000_add_sync_favorite_count_rpc.sql'
)

describe('favorite_count同期RPCのマイグレーション', () => {
  it('movie/series の同期関数を作成し execute 権限を付与する', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/create or replace function public\.sync_movie_favorite_count/i)
    expect(sql).toMatch(/security definer/i)
    expect(sql).toMatch(/grant execute on function public\.sync_movie_favorite_count\(uuid\) to authenticated/i)

    expect(sql).toMatch(/create or replace function public\.sync_series_favorite_count/i)
    expect(sql).toMatch(/grant execute on function public\.sync_series_favorite_count\(text\) to authenticated/i)
  })
})
