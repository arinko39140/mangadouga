import { describe, expect, it, vi } from 'vitest'
import {
  OSHI_LIST_UPDATED_EVENT,
  publishOshiListUpdated,
  subscribeOshiListUpdated,
} from './oshiListEvents.js'

describe('oshiListEvents', () => {
  it('更新通知を発行する', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    const result = publishOshiListUpdated()

    expect(result).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(Event))
    expect(dispatchSpy.mock.calls[0][0].type).toBe(OSHI_LIST_UPDATED_EVENT)
    dispatchSpy.mockRestore()
  })

  it('購読解除でリスナーを削除する', () => {
    const handler = vi.fn()
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const unsubscribe = subscribeOshiListUpdated(handler)
    unsubscribe()

    expect(addSpy).toHaveBeenCalledWith(OSHI_LIST_UPDATED_EVENT, handler)
    expect(removeSpy).toHaveBeenCalledWith(OSHI_LIST_UPDATED_EVENT, handler)
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
