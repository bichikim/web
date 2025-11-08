import {useFakeTimers} from 'sinon'
import {describe, expect, it, vi} from 'vitest'
import {requestIdleCallbackPolyfill} from '../polyfill'

describe('requestIdleCallbackPolyfill', () => {
  it('calls callback with didTimeout=false when executed normally', async () => {
    const clock = useFakeTimers()
    const cb = vi.fn()

    requestIdleCallbackPolyfill(cb)
    await clock.tickAsync(1)
    expect(cb).toHaveBeenCalledTimes(1)
    const arg = cb.mock.calls[0][0]

    expect(arg.didTimeout).toBe(false)
    expect(typeof arg.timeRemaining).toBe('function')
    expect(arg.timeRemaining()).toBeGreaterThanOrEqual(0)
    clock.restore()
  })

  it('calls callback with didTimeout=true when timeout fires first', async () => {
    const clock = useFakeTimers()
    const cb = vi.fn()

    requestIdleCallbackPolyfill(cb, {timeout: 0})
    await clock.tickAsync(0)
    expect(cb).toHaveBeenCalledTimes(1)
    const arg = cb.mock.calls[0][0]

    expect(arg.didTimeout).toBe(true)
    expect(typeof arg.timeRemaining).toBe('function')
    clock.restore()
  })

  it('cancel function prevents execution', async () => {
    const clock = useFakeTimers()
    const cb = vi.fn()

    const cancel = requestIdleCallbackPolyfill(cb, {timeout: 5})

    cancel()
    await clock.tickAsync(10)
    expect(cb).not.toHaveBeenCalled()
    clock.restore()
  })
})
