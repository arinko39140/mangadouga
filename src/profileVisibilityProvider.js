const buildFallbackVisibility = () => ({
  oshiList: 'private',
  oshiSeries: 'private',
})

const normalizeVisibilityValue = (value) => (value === 'public' ? 'public' : 'private')

export const createProfileVisibilityProvider = (supabaseClient) => ({
  async fetchVisibility(input) {
    const targetUserId =
      typeof input === 'object' && input !== null ? input.targetUserId : null
    if (typeof targetUserId !== 'string' || targetUserId.trim() === '') {
      return { ok: false, error: 'invalid_input' }
    }

    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      return { ok: true, data: buildFallbackVisibility() }
    }

    const { data, error } = await supabaseClient
      .from('profile_visibility')
      .select('oshi_list_visibility, oshi_series_visibility')
      .eq('user_id', targetUserId)
      .limit(1)

    if (error) {
      return { ok: true, data: buildFallbackVisibility() }
    }

    const row = data?.[0]
    if (!row) {
      return { ok: true, data: buildFallbackVisibility() }
    }

    return {
      ok: true,
      data: {
        oshiList: normalizeVisibilityValue(row.oshi_list_visibility),
        oshiSeries: normalizeVisibilityValue(row.oshi_series_visibility),
      },
    }
  },
})
