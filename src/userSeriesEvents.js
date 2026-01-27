export const USER_SERIES_UPDATED_EVENT = 'user-series-updated'

export const publishUserSeriesUpdated = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return false
  }
  window.dispatchEvent(new Event(USER_SERIES_UPDATED_EVENT))
  return true
}

export const subscribeUserSeriesUpdated = (handler) => {
  if (
    typeof window === 'undefined' ||
    typeof window.addEventListener !== 'function' ||
    typeof handler !== 'function'
  ) {
    return () => {}
  }

  window.addEventListener(USER_SERIES_UPDATED_EVENT, handler)
  return () => {
    if (typeof window.removeEventListener === 'function') {
      window.removeEventListener(USER_SERIES_UPDATED_EVENT, handler)
    }
  }
}
