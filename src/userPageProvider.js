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

const isDomainMatch = (hostname, domain) =>
  hostname === domain || hostname.endsWith(`.${domain}`)

const resolveLinkCategory = (hostname) => {
  const host = hostname.toLowerCase()
  if (isDomainMatch(host, 'x.com') || isDomainMatch(host, 'twitter.com')) return 'x'
  if (isDomainMatch(host, 'youtube.com') || isDomainMatch(host, 'youtu.be')) return 'youtube'
  return 'other'
}

const normalizeLabel = (label) => {
  if (typeof label !== 'string') return null
  const trimmed = label.trim()
  return trimmed ? trimmed : null
}

const normalizeLink = ({ url, label }) => {
  if (typeof url !== 'string') return null
  const trimmedUrl = url.trim()
  if (!trimmedUrl) return null

  let parsedUrl = null
  try {
    parsedUrl = new URL(trimmedUrl)
  } catch {
    return null
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return null
  }

  return {
    category: resolveLinkCategory(parsedUrl.hostname),
    url: trimmedUrl,
    label: normalizeLabel(label),
  }
}

const buildExternalLinks = (row) =>
  [
    normalizeLink({ url: row?.x_url, label: row?.x_label }),
    normalizeLink({ url: row?.youtube_url, label: row?.youtube_label }),
    normalizeLink({ url: row?.other_url, label: row?.other_label }),
  ].filter(Boolean)

export const createUserPageProvider = (supabaseClient) => ({
  async fetchUserProfile(userId) {
    if (typeof userId !== 'string' || userId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const { data, error } = await supabaseClient
      .from('users')
      .select(
        'user_id, name, icon_url, x_url, x_label, youtube_url, youtube_label, other_url, other_label'
      )
      .eq('user_id', userId)
      .limit(1)

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    const row = data?.[0]
    if (!row) {
      return { ok: false, error: 'not_found' }
    }

    return {
      ok: true,
      data: {
        userId: row.user_id != null ? String(row.user_id) : userId,
        name: row.name ?? '',
        iconUrl: row.icon_url ?? null,
        links: buildExternalLinks(row),
      },
    }
  },

  async updateUserProfile(input) {
    const payload = typeof input === 'object' && input !== null ? input : null
    const userId = payload?.userId != null ? String(payload.userId) : ''
    if (!userId.trim()) {
      return { ok: false, error: 'invalid_input' }
    }
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: false, error: 'not_configured' }
    }

    const normalizeValue = (value, { allowEmpty = false } = {}) => {
      if (typeof value !== 'string') return allowEmpty ? '' : null
      const trimmed = value.trim()
      if (!trimmed && !allowEmpty) return null
      return allowEmpty ? trimmed : trimmed
    }

    const updatePayload = {
      name: normalizeValue(payload?.name, { allowEmpty: true }) ?? '',
      icon_url: normalizeValue(payload?.iconUrl),
      x_url: normalizeValue(payload?.xUrl),
      x_label: normalizeValue(payload?.xLabel),
      youtube_url: normalizeValue(payload?.youtubeUrl),
      youtube_label: normalizeValue(payload?.youtubeLabel),
      other_url: normalizeValue(payload?.otherUrl),
      other_label: normalizeValue(payload?.otherLabel),
    }

    const { error } = await supabaseClient
      .from('users')
      .update(updatePayload)
      .eq('user_id', userId.trim())

    if (error) {
      return { ok: false, error: normalizeError(error) }
    }

    return { ok: true, data: null }
  },
})
