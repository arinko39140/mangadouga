import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const loadEnvFile = async (filePath) => {
  const content = await readFile(filePath, 'utf8')
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .forEach((line) => {
      const index = line.indexOf('=')
      if (index === -1) return
      const key = line.slice(0, index).trim()
      const value = line.slice(index + 1).trim()
      if (!key) return
      process.env[key] = value
    })
}

const chunk = (items, size) => {
  const result = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )

const main = async () => {
  const envPath = resolve(process.cwd(), '.env.local')
  await loadEnvFile(envPath)

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabaseの接続情報が見つかりません。.env.localを確認してください。')
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: listRows, error: listError } = await client.from('list').select('user_id')
  if (listError) throw listError
  const { data: userListRows, error: userListError } = await client
    .from('user_list')
    .select('user_id')
  if (userListError) throw userListError
  const { data: userRows, error: userError } = await client
    .from('users')
    .select('user_id, name')
  if (userError) throw userError

  const listUserIds = new Set((listRows ?? []).map((row) => String(row.user_id)))
  const userListUserIds = new Set((userListRows ?? []).map((row) => String(row.user_id)))
  const usersUserIds = new Set((userRows ?? []).map((row) => String(row.user_id)))

  const referencedUserIds = new Set([...listUserIds, ...userListUserIds])
  const missingUserIds = [...referencedUserIds].filter((id) => !usersUserIds.has(id))

  if (missingUserIds.length > 0) {
    const rows = missingUserIds.map((id) => ({
      user_id: id,
      name: `User ${id.slice(0, 8)}`,
    }))
    const { error } = await client.from('users').upsert(rows, {
      onConflict: 'user_id',
      ignoreDuplicates: true,
    })
    if (error) throw error
  }

  const missingListUserIds = [...usersUserIds].filter((id) => !listUserIds.has(id))
  const validMissingListUserIds = missingListUserIds.filter((id) => isUuid(id))

  for (const batch of chunk(validMissingListUserIds, 200)) {
    const { error } = await client
      .from('list')
      .insert(batch.map((id) => ({ user_id: id, can_display: true })))
    if (error) throw error
  }

  const skippedListUserIds = missingListUserIds.filter((id) => !isUuid(id))

  console.log('added_users', missingUserIds.length)
  console.log('added_lists', validMissingListUserIds.length)
  console.log('skipped_non_uuid_list_users', skippedListUserIds.length)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
