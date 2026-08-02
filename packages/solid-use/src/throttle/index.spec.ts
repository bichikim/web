import {useThrottle} from './'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@solidjs/testing-library'

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should throttle calling the callback function', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()
    const {result: throttle, cleanup} = renderHook(() => useThrottle(callback, 100, options))

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
    cleanup()
  })

  it('should delay the first call when the leading edge is disabled', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() =>
      useThrottle(callback, 100, {leading: false, trailing: true}),
    )

    result.execute('trailing')

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('trailing')
    cleanup()
  })

  it('should not execute a trailing call when the trailing edge is disabled', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() =>
      useThrottle(callback, 100, {leading: true, trailing: false}),
    )

    result.execute('leading')
    result.execute('ignored')

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('leading')

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    cleanup()
  })

  it('should cancel a pending trailing call', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useThrottle(callback, 100))

    result.execute('leading')
    result.execute('trailing')
    result.cancel()
    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('leading')
    cleanup()
  })

  it('should flush a pending trailing call', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useThrottle(callback, 100))

    result.execute('leading')
    result.execute('trailing')
    result.flush()

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('trailing')

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledTimes(2)
    cleanup()
  })
})
