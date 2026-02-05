import { useEffect, useRef, useState } from 'react'

const getReducedMotionPreference = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export const useInViewMotion = () => {
  const ref = useRef(null)
  const [isInView, setIsInView] = useState(false)
  const [shouldReduceMotion, setShouldReduceMotion] = useState(() =>
    getReducedMotionPreference()
  )

  useEffect(() => {
    setShouldReduceMotion(getReducedMotionPreference())
  }, [])

  useEffect(() => {
    if (shouldReduceMotion) {
      setIsInView(true)
      return () => {}
    }

    const element = ref.current
    if (!element || typeof IntersectionObserver !== 'function') {
      setIsInView(true)
      return () => {}
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries.find((item) => item.target === element)
      if (entry?.isIntersecting) {
        setIsInView(true)
        observer.unobserve(element)
      }
    }, { threshold: 0.2 })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [shouldReduceMotion])

  return { ref, isInView, shouldReduceMotion }
}
