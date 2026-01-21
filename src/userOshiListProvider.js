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

const buildPrivateSummary = (status) => ({
  listId: null,
  status,
  favoriteCount: null,
  isFavorited: false,
})

export const createUserOshiListProvider = (supabaseClient) => ({
  async fetchListSummary(userId) {
    if (typeof userId !== 'string' || userId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data: listData, error: listError } = await supabaseClient
      .from('list')
      .select('list_id, favorite_count, can_display')
      .eq('user_id', userId)
      .order('list_id', { ascending: true })
      .limit(1)

    if (listError) {
      return { ok: false, error: normalizeError(listError) }
    }

    const listRow = listData?.[0]
    if (!listRow) {
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .limit(1)

      if (userError) {
        return { ok: false, error: normalizeError(userError) }
      }

      if (!userData?.[0]) {
        return { ok: true, data: buildPrivateSummary('not_found') }
      }

      return { ok: true, data: buildPrivateSummary('none') }
    }

    if (!listRow.can_display) {
      return { ok: true, data: buildPrivateSummary('private') }
    }

    const listId = listRow.list_id != null ? String(listRow.list_id) : ''
    if (!listId) {
      return { ok: true, data: buildPrivateSummary('none') }
    }

    const userResult = await resolveCurrentUserId(supabaseClient)
    if (!userResult.ok) {
      return { ok: false, error: userResult.error }
    }

    const { data: favoriteData, error: favoriteError } = await supabaseClient
      .from('user_list')
      .select('list_id')
      .eq('user_id', userResult.userId)
      .eq('list_id', listId)
      .limit(1)

    if (favoriteError) {
      return { ok: false, error: normalizeError(favoriteError) }
    }

    return {
      ok: true,
      data: {
        listId,
        status: 'public',
        favoriteCount: listRow.favorite_count ?? 0,
        isFavorited: (favoriteData ?? []).length > 0,
      },
    }
  },
})
