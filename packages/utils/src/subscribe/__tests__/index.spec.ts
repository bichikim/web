/**
 * @vitest-environment jsdom
 */
import {createSubscribe, getSubscribeValue} from '../'
import {describe, expect, it, vi} from 'vitest'

describe('createSubscribe', () => {
  it('should create subscribe function', () => {
    const value = 'foo'
    const nextValue = 'bar'
    const eventSubscribe = createSubscribe(() => 'john' as string)
    const callback = vi.fn()
    const unsubscribe = eventSubscribe.subscribe(callback)

    expect(callback).not.toHaveBeenCalled()
    eventSubscribe.update(() => value)
    expect(callback).toHaveBeenNthCalledWith(1, value)
    expect(unsubscribe()).toEqual(value)
    eventSubscribe.update(() => nextValue)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(unsubscribe()).toEqual(nextValue)
  })

  it('should get value', () => {
    const eventSubscribe = createSubscribe(() => 'john' as string)

    expect(getSubscribeValue(eventSubscribe)).toBe('john')
  })
})
