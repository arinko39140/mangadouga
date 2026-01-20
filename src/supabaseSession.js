export const resolveCurrentUserId = async (supabaseClient) => {
  if (!supabaseClient?.auth?.getSession) {
    return { ok: false, error: 'not_configured' }
  }

  const { data, error } = await supabaseClient.auth.getSession()
  const userId = data?.session?.user?.id ?? null
  if (error || !userId) {
    return { ok: false, error: 'auth_required' }
  }

  return { ok: true, userId }
}
