import {useDebounce} from '../index'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'

describe('useDebounce', () => {
  it('should cancel the previous deadline when reactive configuration changes', () => {
    const callback = vi.fn()
    const api = createRoot((dispose) => {
      const [delay, setDelay] = createSignal(200)
      const debounce = useDebounce(callback, delay)
      return {debounce, dispose, setDelay}
    })
    try {
      api.debounce.execute('old')
      vi.advanceTimersByTime(20)
      api.setDelay(50)
      api.debounce.execute('new')
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
      const debounce = useDebounce(
        () => {
          callback()
          if (callback.mock.calls.length === 1) {
            debounce.execute()
            dispose()
          }
        },
        100,
        {leading: true},
      )
      debounce.execute()
    })
    expect(callback).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledOnce()
  })
  it('should not recreate a pending debounce when a queued leading callback reads a signal', () => {
    const callback = vi.fn()
    const api = createRoot((dispose) => {
      const [value, setValue] = createSignal(0)
      const debounce = useDebounce(() => callback(value()), 100, {leading: true})
      debounce.execute()
      return {debounce, dispose, setValue}
    })
    try {
      expect(callback).toHaveBeenCalledTimes(1)
      api.setValue(1)
      api.debounce.execute()
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

    expect(callback).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('third')
    result.execute('fourth')
    expect(callback).toHaveBeenCalledOnce()
    cleanup()
  })

  it('should execute the latest call at maxWait without another call and avoid duplicate execution', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, {maxWait: 150}))
    try {
      result.execute('first')
      vi.advanceTimersByTime(80)
      result.execute('latest')
      vi.advanceTimersByTime(69)
      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(callback).toHaveBeenCalledOnce()
      expect(callback).toHaveBeenCalledWith('latest')
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledOnce()
    } finally {
      cleanup()
    }
  })

  it('should start a new waiting period after cancel', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() => useDebounce(callback, 100, {maxWait: 150}))
    try {
      result.execute('cancelled')
      result.cancel()
      vi.advanceTimersByTime(200)
      expect(callback).not.toHaveBeenCalled()
      result.execute('new')
      expect(callback).not.toHaveBeenCalled()
      vi.advanceTimersByTime(100)
      expect(callback).toHaveBeenCalledOnce()
      expect(callback).toHaveBeenCalledWith('new')
    } finally {
      cleanup()
    }
  })

  it('should keep executing at maxWait during sustained input with both edges enabled', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() =>
      useDebounce(callback, 100, {leading: true, maxWait: 150, trailing: true}),
    )
    try {
      result.execute(0)
      for (let time = 50; time <= 300; time += 50) {
        vi.advanceTimersByTime(50)
        result.execute(time)
      }
      expect(callback.mock.calls).toEqual([[0], [100], [250]])
      vi.advanceTimersByTime(100)
      expect(callback.mock.calls).toEqual([[0], [100], [250], [300]])
    } finally {
      cleanup()
    }
  })

  it('should respect disabled edges when maxWait expires', () => {
    const callback = vi.fn()
    const {result, cleanup} = renderHook(() =>
      useDebounce(callback, 100, {leading: false, maxWait: 150, trailing: false}),
    )
    try {
      result.execute('first')
      vi.advanceTimersByTime(80)
      result.execute('second')
      vi.advanceTimersByTime(70)
      result.execute('deadline')
      vi.advanceTimersByTime(200)
      expect(callback).not.toHaveBeenCalled()
    } finally {
      cleanup()
    }
  })

  it.each(['flush', 'dispose'] as const)(
    'should release a pending maxWait execution on %s',
    (operation) => {
      const callback = vi.fn()
      const {result, cleanup} = renderHook(() => useDebounce(callback, 100, {maxWait: 150}))
      try {
        result.execute('first')
        vi.advanceTimersByTime(80)
        result.execute('latest')
        if (operation === 'flush') {
          result.flush()
          expect(callback).toHaveBeenCalledOnce()
          expect(callback).toHaveBeenCalledWith('latest')
        } else {
          cleanup()
          expect(callback).not.toHaveBeenCalled()
        }
        vi.advanceTimersByTime(200)
        expect(callback).toHaveBeenCalledTimes(operation === 'flush' ? 1 : 0)
      } finally {
        cleanup()
      }
    },
  )
})
