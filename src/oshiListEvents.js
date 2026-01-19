export const OSHI_LIST_UPDATED_EVENT = 'oshi-list-updated'

export const publishOshiListUpdated = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return false
  }
  window.dispatchEvent(new Event(OSHI_LIST_UPDATED_EVENT))
  return true
}

export const subscribeOshiListUpdated = (handler) => {
  if (
    typeof window === 'undefined' ||
    typeof window.addEventListener !== 'function' ||
    typeof handler !== 'function'
  ) {
    return () => {}
  }

  window.addEventListener(OSHI_LIST_UPDATED_EVENT, handler)
  return () => {
    if (typeof window.removeEventListener === 'function') {
      window.removeEventListener(OSHI_LIST_UPDATED_EVENT, handler)
    }
  }
}
