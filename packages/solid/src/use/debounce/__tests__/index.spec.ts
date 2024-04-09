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

    timer.restore()
  })
})
