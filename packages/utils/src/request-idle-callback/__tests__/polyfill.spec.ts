
import {describe, expect, it, vi} from 'vitest'
import {requestIdleCallbackPolyfill} from '../polyfill'

describe('requestIdleCallbackPolyfill', () => {
  it('calls callback with didTimeout=false when executed normally', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    requestIdleCallbackPolyfill(callback)
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
    const arg = callback.mock.calls[0][0]

    expect(arg.didTimeout).toBe(false)
    expect(typeof arg.timeRemaining).toBe('function')
    expect(arg.timeRemaining()).toBeGreaterThanOrEqual(0)
    vi.useRealTimers()
  })

  it('calls callback with didTimeout=true when timeout fires first', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    requestIdleCallbackPolyfill(callback, {timeout: 0})
    vi.advanceTimersByTime(0)
    expect(callback).toHaveBeenCalledTimes(1)
    const arg = callback.mock.calls[0][0]

    expect(arg.didTimeout).toBe(true)
    expect(typeof arg.timeRemaining).toBe('function')
    vi.useRealTimers()
  })

  it('cancel function prevents execution', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()

    const cancel = requestIdleCallbackPolyfill(callback, {timeout: 5})

    cancel()
    vi.advanceTimersByTime(10)
    expect(callback).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
