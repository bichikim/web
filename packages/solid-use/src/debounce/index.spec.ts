import {useDebounce} from './'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@solidjs/testing-library'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce calling the callback function', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, options))

    result.execute(...args)
    vi.advanceTimersByTime(50)
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
  })

  it('should cancel debounce with dispose', () => {
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
  })

  it('should cancel debounce', () => {
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()

    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, options))

    result.execute(...args)
    vi.advanceTimersByTime(50)
    result.execute(...args)
    result.cancel()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    cleanup()
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

  it('should execute on the trailing edge by default', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useDebounce(callback, 100))

    result.execute('trailing')

    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('trailing')
    cleanup()
  })

  it('should not execute twice for one call with both edges enabled', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() =>
      useDebounce(callback, 100, {leading: true, trailing: true}),
    )

    result.execute('leading')

    expect(callback).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(100)

    expect(callback).toHaveBeenCalledOnce()
    cleanup()
  })

  it('should execute when maxWait is reached during repeated calls', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, {maxWait: 150}))

    result.execute('first')
    vi.advanceTimersByTime(50)
    result.execute('second')
    vi.advanceTimersByTime(50)
    result.execute('third')
    vi.advanceTimersByTime(50)
    result.execute('fourth')

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('fourth')
    cleanup()
  })
})
