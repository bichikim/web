import {useThrottle} from '../index'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'

describe('useThrottle', () => {
  it('should cancel the previous deadline when reactive configuration changes', () => {
    const callback = vi.fn()
    const api = createRoot((dispose) => {
      const [delay, setDelay] = createSignal(200)
      const throttle = useThrottle(callback, delay, {leading: false})
      return {dispose, setDelay, throttle}
    })
    try {
      api.throttle.execute('old')
      vi.advanceTimersByTime(20)
      api.setDelay(50)
      api.throttle.execute('new')
      vi.advanceTimersByTime(49)
      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(callback.mock.calls).toEqual([['new']])
      vi.advanceTimersByTime(200)
      expect(callback).toHaveBeenCalledOnce()
    } finally {
      api.dispose()
    }
  })
  it('should cancel reentrant calls when a queued leading callback disposes its root', () => {
    const callback = vi.fn()
    createRoot((dispose) => {
      const throttle = useThrottle(() => {
        callback()
        if (callback.mock.calls.length === 1) {
          throttle.execute()
          dispose()
        }
      }, 100)
      throttle.execute()
    })
    expect(callback).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
  })
  it('should not recreate a pending throttle when a queued leading callback reads a signal', () => {
    const callback = vi.fn()
    const api = createRoot((dispose) => {
      const [value, setValue] = createSignal(0)
      const throttle = useThrottle(() => callback(value()), 100)
      throttle.execute()
      return {dispose, setValue, throttle}
    })
    try {
      expect(callback).toHaveBeenCalledTimes(1)
      api.setValue(1)
      api.throttle.execute()
      expect(callback).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(100)
      expect(callback.mock.calls).toEqual([[0], [1]])
    } finally {
      api.dispose()
    }
  })
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
    expect(callback).toHaveBeenCalledTimes(2)
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
