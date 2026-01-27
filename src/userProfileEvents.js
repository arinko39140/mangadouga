export const USER_PROFILE_UPDATED_EVENT = 'user-profile-updated'

export const publishUserProfileUpdated = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT))
}

export const subscribeUserProfileUpdated = (handler) => {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(USER_PROFILE_UPDATED_EVENT, handler)
  return () => window.removeEventListener(USER_PROFILE_UPDATED_EVENT, handler)
}
