import {useThrottle} from '../'
import {describe, expect, it, vi} from 'vitest'
import {useFakeTimers} from 'sinon'

describe('useThrottle', () => {
  it('should throttle calling the callback function', () => {
    const timer = useFakeTimers()
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()
    const throttle = useThrottle(callback, 100, options)

    throttle.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    throttle.execute(...args)
    timer.tick(50)
    expect(callback).toHaveBeenCalledTimes(1)
    throttle.execute(...args)
    timer.tick(50)
    expect(callback).toHaveBeenCalledTimes(2)
  })
})
