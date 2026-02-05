import { resolveCurrentUserId } from './supabaseSession.js'

const isNetworkError = (error) => {
  if (!error) return false
  const message = String(error.message ?? '')
  return message.includes('Failed to fetch') || message.includes('NetworkError')
}

const isAuthError = (error) => {
  if (!error) return false
  if (error.status === 401) return true
  const code = String(error.code ?? '')
  if (code === 'PGRST301') return true
  const message = String(error.message ?? '')
  return message.includes('JWT') || message.includes('auth') || message.includes('Authentication')
}

const normalizeError = (error) => {
  if (isAuthError(error)) return 'auth_required'
  return isNetworkError(error) ? 'network' : 'unknown'
}

const SUPPRESS_WINDOW_MS = 400

export const createHistoryRecorder = (supabaseClient) => {
  const lastRecords = new Map()

  return {
    async recordView(input) {
      const movieId = typeof input?.movieId === 'string' ? input.movieId.trim() : ''
      const clickedAt = typeof input?.clickedAt === 'string' ? input.clickedAt.trim() : ''
      const source = typeof input?.source === 'string' ? input.source : ''

      if (!movieId || !clickedAt) {
        return { ok: false, error: 'invalid_input' }
      }

      if (!supabaseClient || typeof supabaseClient.from !== 'function') {
        return { ok: false, error: 'not_configured' }
      }

      const userResult = await resolveCurrentUserId(supabaseClient)
      if (!userResult.ok) {
        return { ok: false, error: userResult.error }
      }

      const key = `${movieId}:${source}`
      const now = Date.now()
      const lastRecord = lastRecords.get(key)
      if (typeof lastRecord === 'number' && now - lastRecord < SUPPRESS_WINDOW_MS) {
        return { ok: true, data: { historyId: undefined } }
      }
      lastRecords.set(key, now)

      const { data, error } = await supabaseClient
        .from('history')
        .insert({ user_id: userResult.userId, movie_id: movieId, clicked_at: clickedAt })

      if (error) {
        return { ok: false, error: normalizeError(error) }
      }

      return { ok: true, data: { historyId: data?.[0]?.history_id } }
    },
  }
}
