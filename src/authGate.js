const resolveSession = async (supabaseClient) => {
  if (!supabaseClient?.auth?.getSession) {
    return { session: null, error: new Error('not_configured') }
  }
  return supabaseClient.auth.getSession()
}

export const buildLoginRedirectPath = (context) => {
  if (!context?.seriesId) {
    return '/login/'
  }

  const params = new URLSearchParams()
  if (context.selectedMovieId) {
    params.set('selectedMovieId', context.selectedMovieId)
  }
  params.set('sortOrder', context.sortOrder ?? 'latest')

  const redirectPath = `/series/${context.seriesId}/?${params.toString()}`
  return `/login/?redirect=${encodeURIComponent(redirectPath)}`
}

export const createAuthGate = ({ supabaseClient, navigate, getRedirectContext } = {}) => ({
  async getStatus() {
    const { data, error } = await resolveSession(supabaseClient)
    if (error || !data?.session?.user) {
      return { ok: false, error: { type: 'auth_required' } }
    }
    return { ok: true, status: { isAuthenticated: true } }
  },

  redirectToLogin() {
    if (typeof navigate !== 'function') return
    const context = typeof getRedirectContext === 'function' ? getRedirectContext() : null
    navigate(buildLoginRedirectPath(context))
  },
})
