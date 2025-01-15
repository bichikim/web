import {useDebounce} from '../'
import {describe, expect, it, vi} from 'vitest'
import {useFakeTimers} from 'sinon'

describe('useDebounce', () => {
  it('should debounce calling the callback function', () => {
    const timer = useFakeTimers()
    const options = {leading: true}
    const args = ['hello']
    const callback = vi.fn()
    const debounce = useDebounce(callback, 100, options)

    debounce.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    timer.tick(50)
    debounce.execute(...args)
    expect(callback).toHaveBeenCalledTimes(1)
    timer.tick(100)
    expect(callback).toHaveBeenCalledTimes(2)
    timer.restore()
  })
})
