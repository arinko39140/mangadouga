import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'

describe('history migration', () => {
  it('adds history index and default list trigger', () => {
    const migrationPath = resolve(
      process.cwd(),
      'supabase/migrations/20260205120000_history_rls_index_default_list_trigger.sql'
    )
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toMatch(/create index if not exists\s+history_user_clicked_idx/i)
    expect(sql).toMatch(/ensure_default_list_for_user/i)
    expect(sql).toMatch(/create trigger\s+default_list_insert_trigger/i)
  })
})
