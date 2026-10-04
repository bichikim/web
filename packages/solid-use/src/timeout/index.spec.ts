/** @vitest-environment jsdom */

import {createTimeout} from './'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {cleanup, renderHook} from '@solidjs/testing-library'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('createTimeout', () => {
  it('should restart the delay and execute only the latest request', () => {
    const callback = vi.fn()
    const {result: timeout} = renderHook(() => createTimeout(callback, 100))
    timeout.execute('first')
    vi.advanceTimersByTime(50)
    timeout.execute('second')
    vi.advanceTimersByTime(99)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledExactlyOnceWith('second')
  })

  it('should cancel pending execution and allow a later request', () => {
    const callback = vi.fn()
    const {result: timeout} = renderHook(() => createTimeout(callback, 100))
    timeout.execute()
    timeout.cancel()
    timeout.flush()
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
    timeout.execute()
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
  })

  it('should cancel pending execution when its owner is disposed', () => {
    const callback = vi.fn()
    const {result: timeout, cleanup: dispose} = renderHook(() => createTimeout(callback, 100))
    timeout.execute()
    expect(vi.getTimerCount()).toBe(1)
    dispose()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(100)
    expect(callback).not.toHaveBeenCalled()
  })
})
