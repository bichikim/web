import {useDebounce} from '../'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SinonFakeTimers, useFakeTimers} from 'sinon'
import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'

describe('useDebounce', () => {
  it('should debounce calling the callback function', () => {
    vi.useFakeTimers()
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, options))

    result.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
    cleanup()
    vi.useRealTimers()
  })

  it('should cancel debounce with dispose', () => {
    vi.useFakeTimers()
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, options))

    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    cleanup()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('should cancel debounce', () => {
    vi.useFakeTimers()
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, options))

    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    cleanup()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    result.cancel()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('should flush debounce', () => {
    vi.useFakeTimers()
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, options))

    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    result.flush()
    expect(callback).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
    cleanup()
  })
})
