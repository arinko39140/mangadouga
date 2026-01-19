// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260120101000_backfill_oshi_list_base.sql'
)

describe('推しリスト基盤データのマイグレーション', () => {
  it('公開フラグ・登録数・初期整合とインデックスを定義している', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/add column if not exists can_display/i)
    expect(sql).toMatch(/add column if not exists favorite_count/i)
    expect(sql).toMatch(/oshi_list_favorite/i)
    expect(sql).toMatch(/create index if not exists list_favorite_count_idx/i)
    expect(sql).toMatch(/create index if not exists list_movie_list_id_idx/i)
    expect(sql).toMatch(/create index if not exists oshi_list_favorite_target_list_id_idx/i)
  })
})
