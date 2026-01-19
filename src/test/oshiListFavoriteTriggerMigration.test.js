// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260120103000_oshi_list_favorite_trigger.sql'
)

describe('推しリストお気に入り数のトリガー', () => {
  it('登録/解除でfavorite_countを更新するトリガーを定義している', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/create or replace function public\.update_list_favorite_count/i)
    expect(sql).toMatch(/tg_op/i)
    expect(sql).toMatch(/favorite_count/i)
    expect(sql).toMatch(/greatest/i)
    expect(sql).toMatch(/create trigger oshi_list_favorite_count_trigger/i)
    expect(sql).toMatch(/after insert or delete on public\.oshi_list_favorite/i)
  })
})
