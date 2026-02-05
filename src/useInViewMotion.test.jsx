import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useInViewMotion } from './hooks/useInViewMotion.js'

const mockMatchMedia = (matches) => {
  return vi.fn().mockImplementation(() => ({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

const MotionBox = () => {
  const { ref, isInView, shouldReduceMotion } = useInViewMotion()
  const className = shouldReduceMotion
    ? 'box'
    : `box motion-appear${isInView ? ' is-inview' : ''}`
  return (
    <div data-testid="box" ref={ref} className={className}>
      box
    </div>
  )
}

describe('useInViewMotion', () => {
  let observerCallback
  let observerInstance

  beforeEach(() => {
    observerCallback = null
    observerInstance = null
    window.matchMedia = mockMatchMedia(false)

    global.IntersectionObserver = class {
      constructor(callback) {
        observerCallback = callback
        observerInstance = this
      }

      observe = vi.fn()

      unobserve = vi.fn()

      disconnect = vi.fn()
    }
  })

  afterEach(() => {
    delete global.IntersectionObserver
  })

  it('画面内出現でis-inviewが付与される', async () => {
    render(<MotionBox />)

    const box = screen.getByTestId('box')
    expect(box).toHaveClass('motion-appear')
    expect(observerInstance.observe).toHaveBeenCalledWith(box)

    act(() => {
      observerCallback([{ isIntersecting: true, target: box }])
    })

    await waitFor(() => {
      expect(box).toHaveClass('is-inview')
    })
  })

  it('動き抑制時はmotion-appearを付与しない', () => {
    window.matchMedia = mockMatchMedia(true)

    render(<MotionBox />)

    const box = screen.getByTestId('box')
    expect(box).not.toHaveClass('motion-appear')
  })
})
