// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260120102000_oshi_list_rls_and_view.sql'
)

describe('推しリストRLSと公開ビューのマイグレーション', () => {
  it('お気に入りテーブルとRLS、公開ビュー、権限を定義している', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/create table if not exists public\.oshi_list_favorite/i)
    expect(sql).toMatch(/alter table public\.oshi_list_favorite enable row level security/i)
    expect(sql).toMatch(/create policy .*oshi list favorite owner read/i)
    expect(sql).toMatch(/auth\.uid\(\)/i)
    expect(sql).toMatch(/create or replace view public\.oshi_list_catalog/i)
    expect(sql).toMatch(/where list\.can_display = true/i)
    expect(sql).toMatch(/is_favorited/i)
    expect(sql).toMatch(/revoke all on table public\.oshi_list_catalog from anon/i)
    expect(sql).toMatch(/grant select on table public\.oshi_list_catalog to authenticated/i)
  })
})
