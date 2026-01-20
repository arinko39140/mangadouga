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

const formatJstIso = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+09:00`
}

const isYoutubeUrl = (url) => {
  if (!url) return false
  return /youtube\.com|youtu\.be/i.test(url)
}

const fetchYoutubeTitle = async (url) => {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
  const response = await fetch(oembedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
    },
  })
  if (!response.ok) return null
  const data = await response.json()
  return typeof data?.title === 'string' ? data.title.trim() : null
}

const baseTitles = [
  '星降る丘の約束',
  '雨音の手紙',
  '月影の旅路',
  '風待ちの庭',
  '花筏の夜',
  '玻璃の港',
  '灯りのない道',
  '硝子の鍵',
  '砂時計の告白',
  '白紙の地図',
  '夜明けの記憶',
  '遠雷のしるし',
  '海辺のささやき',
  '薄明の誓い',
  '雪原の灯',
  '鳥籠の歌',
  '夏椿の舟',
  '潮騒の片隅',
  '夜更けの道標',
  '黎明の文箱',
  '夢路の栞',
  '霞む灯台',
  'さざ波の祝詞',
  '宵闇の花束',
  '銀砂の手記',
  '露草の指輪',
  '夕凪の約束',
  '山影の便り',
  'ほたる火の記憶',
  '雲間の帰郷',
]

const suffixes = ['前夜', '余白', '残像', '外伝', '後日譚', '小景', '余韻', '書簡', '章']

const pickUniqueTitle = (usedTitles, index) => {
  const base = baseTitles[index % baseTitles.length]
  if (!usedTitles.has(base)) return base
  for (let i = 0; i < suffixes.length; i += 1) {
    const candidate = `${base}・${suffixes[i]}`
    if (!usedTitles.has(candidate)) return candidate
  }
  let counter = 2
  while (usedTitles.has(`${base} ${counter}`)) {
    counter += 1
  }
  return `${base} ${counter}`
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

  const nowUtc = new Date()
  const nowJst = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000)
  const startJst = new Date(nowJst.getTime() - 7 * 24 * 60 * 60 * 1000)

  const startIso = formatJstIso(startJst)
  const endIso = formatJstIso(nowJst)

  const { data: movies, error } = await client
    .from('movie')
    .select('movie_id, movie_title, url, update')
    .gte('update', startIso)
    .lte('update', endIso)
    .order('update', { ascending: true })

  if (error) throw error

  const usedTitles = new Set((movies ?? []).map((row) => row.movie_title).filter(Boolean))
  let updatedCount = 0

  for (let i = 0; i < (movies ?? []).length; i += 1) {
    const row = movies[i]
    let nextTitle = null

    if (isYoutubeUrl(row.url)) {
      nextTitle = await fetchYoutubeTitle(row.url)
    }

    if (!nextTitle) {
      nextTitle = pickUniqueTitle(usedTitles, i)
    }

    if (!nextTitle || nextTitle === row.movie_title) {
      usedTitles.add(row.movie_title)
      continue
    }

    const { error: updateError } = await client
      .from('movie')
      .update({ movie_title: nextTitle })
      .eq('movie_id', row.movie_id)

    if (updateError) throw updateError

    usedTitles.add(nextTitle)
    updatedCount += 1
  }

  console.log('updated', updatedCount)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
