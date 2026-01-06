import {useThrottle} from './'
import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest'
import {renderHook} from '@solidjs/testing-library'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should throttle calling the callback function', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()
    const {result: throttle} = renderHook(() => useThrottle(callback, 100, options))

    throttle.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    throttle.execute(...args)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    throttle.execute(...args)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(2)
  })
})
