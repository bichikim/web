/** @vitest-environment jsdom */
import {describe, expect, it, vi} from 'vitest'
import {subscribeEvent} from '..'

describe('subscribeEvent', () => {
  it('should deliver only the subscribed event and stop after repeated cleanup', () => {
    const target = new EventTarget()
    const handler = vi.fn()
    const other = vi.fn()
    target.addEventListener('change', other)
    const unsubscribe = subscribeEvent(target, 'change', handler)
    const event = new Event('change')
    target.dispatchEvent(new Event('other'))
    expect(handler).not.toHaveBeenCalled()
    target.dispatchEvent(event)
    expect(handler).toHaveBeenCalledExactlyOnceWith(event)
    unsubscribe()
    unsubscribe()
    target.dispatchEvent(new Event('change'))
    expect(handler).toHaveBeenCalledOnce()
    expect(other).toHaveBeenCalledTimes(2)
  })

  it('should remove a capturing listener even when the caller changes its options', () => {
    const target = new EventTarget()
    const handler = vi.fn()
    const options = {capture: true}
    const unsubscribe = subscribeEvent(target, 'change', handler, options)
    target.dispatchEvent(new Event('change'))
    expect(handler).toHaveBeenCalledOnce()
    options.capture = false
    unsubscribe()
    target.dispatchEvent(new Event('change'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('should support listener objects and native once and abort options', () => {
    const target = new EventTarget()
    const once = {handleEvent: vi.fn()}
    const controller = new AbortController()
    const aborted = vi.fn()
    const unsubscribeOnce = subscribeEvent(target, 'change', once, {once: true})
    const unsubscribeAborted = subscribeEvent(target, 'change', aborted, {
      signal: controller.signal,
    })
    target.dispatchEvent(new Event('change'))
    controller.abort()
    target.dispatchEvent(new Event('change'))
    expect(once.handleEvent).toHaveBeenCalledOnce()
    expect(aborted).toHaveBeenCalledOnce()
    unsubscribeOnce()
    unsubscribeAborted()
  })
})
