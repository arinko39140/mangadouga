import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
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

const ensureAuthUser = async ({ client, email, password, name }) => {
  const { data: listData, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })
  if (listError) throw listError

  const existing = listData?.users?.find((user) => user.email === email)
  if (existing) return existing

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })
  if (error) throw error
  return data.user
}

const ensurePublicUserProfile = async ({ client, userId, name }) => {
  const { error } = await client.from('users').upsert(
    {
      user_id: userId,
      name,
    },
    { onConflict: 'user_id' }
  )
  if (error) throw error
}

const ensureList = async ({ client, ownerId }) => {
  const { data: existing, error: selectError } = await client
    .from('list')
    .select('list_id')
    .eq('user_id', ownerId)
    .order('list_id', { ascending: true })
    .limit(1)

  if (selectError) throw selectError
  if (existing?.[0]?.list_id != null) return existing[0].list_id

  const { data: inserted, error: insertError } = await client
    .from('list')
    .insert({ user_id: ownerId, can_display: true })
    .select('list_id')
    .single()

  if (insertError) throw insertError
  return inserted.list_id
}

const hasListMovies = async ({ client, listId }) => {
  const { data, error } = await client
    .from('list_movie')
    .select('movie_id')
    .eq('list_id', listId)
    .limit(1)

  if (error) throw error
  return (data ?? []).length > 0
}

const insertMoviesForList = async ({ client, listId, movies }) => {
  const movieRows = movies.map((movie) => ({
    movie_id: randomUUID(),
    movie_title: movie.title,
    url: movie.url,
    thumbnail_url: movie.thumbnailUrl,
    series_id: movie.seriesId ?? null,
    weekday: movie.weekday,
  }))

  const { error: movieError } = await client.from('movie').insert(movieRows)
  if (movieError) throw movieError

  const listMovieRows = movieRows.map((movie) => ({
    list_id: listId,
    movie_id: movie.movie_id,
  }))

  const { error: listMovieError } = await client.from('list_movie').insert(listMovieRows)
  if (listMovieError) throw listMovieError
}

const ensureFavorite = async ({ client, userId, listId }) => {
  const { data, error: selectError } = await client
    .from('user_list')
    .select('list_id')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .limit(1)

  if (selectError) throw selectError
  if ((data ?? []).length > 0) return

  const { error } = await client
    .from('user_list')
    .insert({ user_id: userId, list_id: listId })
  if (error) throw error
}

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

  const owners = [
    {
      email: 'oshi-owner-1@example.com',
      password: 'OshiOwner1!234',
      name: 'Oshi Creator Alpha',
      movies: [
        {
          title: 'Alpha Story Episode 1',
          url: 'https://example.com/alpha-episode-1',
          thumbnailUrl: 'https://picsum.photos/seed/oshi-alpha-1/640/360',
          weekday: 'mon',
        },
        {
          title: 'Alpha Story Episode 2',
          url: 'https://example.com/alpha-episode-2',
          thumbnailUrl: 'https://picsum.photos/seed/oshi-alpha-2/640/360',
          weekday: 'tue',
        },
      ],
    },
    {
      email: 'oshi-owner-2@example.com',
      password: 'OshiOwner2!234',
      name: 'Oshi Creator Beta',
      movies: [
        {
          title: 'Beta Chronicle',
          url: 'https://example.com/beta-chronicle',
          thumbnailUrl: 'https://picsum.photos/seed/oshi-beta-1/640/360',
          weekday: 'wed',
        },
        {
          title: 'Beta Chronicle: Extra',
          url: 'https://example.com/beta-chronicle-extra',
          thumbnailUrl: 'https://picsum.photos/seed/oshi-beta-2/640/360',
          weekday: 'thu',
        },
      ],
    },
  ]

  const viewer = {
    email: 'oshi-viewer@example.com',
    password: 'OshiViewer!234',
    name: 'Oshi Viewer',
  }

  const viewerUser = await ensureAuthUser({ client, ...viewer })

  for (const owner of owners) {
    const ownerUser = await ensureAuthUser({ client, ...owner })
    await ensurePublicUserProfile({ client, userId: ownerUser.id, name: owner.name })
    const listId = await ensureList({ client, ownerId: ownerUser.id })

    const alreadyHasMovies = await hasListMovies({ client, listId })
    if (!alreadyHasMovies) {
      await insertMoviesForList({ client, listId, movies: owner.movies })
    }

    await ensureFavorite({ client, userId: viewerUser.id, listId })

    console.log(`list ${listId} seeded for ${owner.name}`)
  }

  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
