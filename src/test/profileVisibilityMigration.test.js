// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const migrationPath = resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260302100000_create_profile_visibility.sql'
)

describe('profile_visibilityのマイグレーション', () => {
  it('可視性テーブル・RLS・バックフィル・新規ユーザートリガーを定義する', () => {
    const sql = readFileSync(migrationPath, 'utf-8')

    expect(sql).toMatch(/create table if not exists public\.profile_visibility/i)
    expect(sql).toMatch(/oshi_list_visibility/i)
    expect(sql).toMatch(/oshi_series_visibility/i)
    expect(sql).toMatch(/check \(oshi_list_visibility in \('public','private'\)\)/i)
    expect(sql).toMatch(/check \(oshi_series_visibility in \('public','private'\)\)/i)
    expect(sql).toMatch(/enable row level security/i)
    expect(sql).toMatch(/create policy "Profile visibility read"/i)
    expect(sql).toMatch(/create policy "Profile visibility update"/i)
    expect(sql).toMatch(/insert into public\.profile_visibility/i)
    expect(sql).toMatch(/from public\.users/i)
    expect(sql).toMatch(/list\.can_display/i)
    expect(sql).toMatch(/user_series\.can_display/i)
    expect(sql).toMatch(/create or replace function public\.handle_new_user_profile_visibility/i)
    expect(sql).toMatch(/create trigger .*profile_visibility/i)
  })
})
