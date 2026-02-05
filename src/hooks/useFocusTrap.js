import { useEffect, useRef } from 'react'

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'

const getFocusableElements = (container) => {
  if (!container) return []
  return Array.from(container.querySelectorAll(focusableSelector)).filter((el) => {
    return typeof el.focus === 'function' && !el.hasAttribute('disabled')
  })
}

export const useFocusTrap = ({ active, containerRef, onDeactivate, returnFocusRef }) => {
  const previousActiveElementRef = useRef(null)

  useEffect(() => {
    if (!active) return undefined

    const container = containerRef?.current
    if (!container) return undefined

    previousActiveElementRef.current = document.activeElement

    const focusFirst = () => {
      const focusable = getFocusableElements(container)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        container.focus()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onDeactivate?.()
        return
      }
      if (event.key !== 'Tab') return

      const focusable = getFocusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const currentIndex = focusable.indexOf(document.activeElement)
      const lastIndex = focusable.length - 1

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault()
          focusable[lastIndex].focus()
        }
        return
      }

      if (currentIndex === -1 || currentIndex === lastIndex) {
        event.preventDefault()
        focusable[0].focus()
      }
    }

    const handleFocusIn = (event) => {
      if (container.contains(event.target)) return
      focusFirst()
    }

    const rafId = window.requestAnimationFrame(() => {
      focusFirst()
    })

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      window.cancelAnimationFrame(rafId)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
    }
  }, [active, containerRef, onDeactivate])

  useEffect(() => {
    if (active) return
    const returnTarget = returnFocusRef?.current ?? previousActiveElementRef.current
    if (returnTarget && typeof returnTarget.focus === 'function') {
      returnTarget.focus()
    }
  }, [active, returnFocusRef])
}
