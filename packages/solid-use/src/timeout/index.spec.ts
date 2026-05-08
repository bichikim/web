import {useTimeout} from './'
import {describe, expect, it, vi} from 'vitest'
import {renderHook} from '@solidjs/testing-library'

describe('useTimeout', () => {
  it('should execute callback after wait', async () => {
    vi.useFakeTimers()
    const callback = vi.fn()
    const wait = 100
    const {result: timeout} = renderHook(() => useTimeout(callback, wait))

    timeout.execute()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(0)
    timeout.execute()
    vi.advanceTimersByTime(50)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
