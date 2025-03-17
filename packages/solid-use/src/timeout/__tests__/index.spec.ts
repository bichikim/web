import {useTimeout} from '../'
import {describe, expect, it, vi} from 'vitest'
import {useFakeTimers} from 'sinon'
import {renderHook} from '@solidjs/testing-library'

describe('useTimeout', () => {
  it('should execute callback after wait', async () => {
    const clock = useFakeTimers()
    const callback = vi.fn()
    const wait = 100
    const {result: timeout} = renderHook(() => useTimeout(callback, wait))

    timeout.execute()
    clock.tick(50)
    expect(callback).toHaveBeenCalledTimes(0)
    timeout.execute()
    clock.tick(50)
    expect(callback).toHaveBeenCalledTimes(1)
    clock.restore()
  })
})
