// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260301090000_user_list_favorite_cleanup.sql'
)

describe('user_list お気に入りのマイグレーション', () => {
  it('oshi_list_favoriteを削除し user_list のポリシーとトリガーで favorite_count を維持する', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/drop trigger if exists oshi_list_favorite_count_trigger/i)
    expect(sql).toMatch(/drop table if exists public\.oshi_list_favorite/i)
    expect(sql).toMatch(/create policy "User list owner insert"/i)
    expect(sql).toMatch(/create policy "User list owner delete"/i)
    expect(sql).toMatch(/create or replace function public\.update_user_list_favorite_count/i)
    expect(sql).toMatch(/create trigger user_list_favorite_count_trigger/i)
    expect(sql).toMatch(/after insert or delete on public\.user_list/i)
  })
})
