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

  it('should support bigint values without treating them as updater functions', () => {
    const eventSubscribe = createSubscribe(() => 1n)

    eventSubscribe.update(2n)

    expect(getSubscribeValue(eventSubscribe)).toBe(2n)
  })

  it('should reject function values at compile time', () => {
    // @ts-expect-error Function values are ambiguous with the update callback contract.
    createSubscribe(() => () => 'value')
  })
})
