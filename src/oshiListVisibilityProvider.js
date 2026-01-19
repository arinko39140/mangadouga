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
  if (error?.code === '42501') return 'forbidden'
  return isNetworkError(error) ? 'network' : 'unknown'
}

const mapVisibility = (canDisplay) => (canDisplay ? 'public' : 'private')

export const createOshiListVisibilityProvider = (supabaseClient) => ({
  async fetchVisibility(targetListId) {
    if (typeof targetListId !== 'string' || targetListId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('list')
      .select('can_display, user_id')
      .eq('list_id', targetListId)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const row = data?.[0]
    if (!row) {
      return { ok: false, error: 'unknown' }
    }

    return { ok: true, data: { visibility: mapVisibility(row.can_display) } }
  },

  async updateVisibility(targetListId, visibility) {
    if (typeof targetListId !== 'string' || targetListId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (visibility !== 'public' && visibility !== 'private') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const canDisplay = visibility === 'public'
    const { data, error } = await supabaseClient
      .from('list')
      .update({ can_display: canDisplay })
      .eq('list_id', targetListId)
      .select('can_display')

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const row = data?.[0]
    if (!row) {
      return { ok: false, error: 'unknown' }
    }

    return { ok: true, data: { visibility: mapVisibility(row.can_display) } }
  },
})
