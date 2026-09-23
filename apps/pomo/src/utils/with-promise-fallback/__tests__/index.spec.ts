import {expect, it} from 'vitest'
import {withPromiseFallback} from '..'

it('should preserve fulfilled values including null and undefined', async () => {
  const value = {enabled: true}
  expect(await withPromiseFallback(Promise.resolve(value), false)).toBe(value)
  expect(await withPromiseFallback(Promise.resolve(null), false)).toBeNull()
  expect(await withPromiseFallback(Promise.resolve(undefined), false)).toBeUndefined()
})

it.each([new Error('failed'), null, undefined, 'failed'])(
  'should return the exact fallback for rejection reason %s',
  async (reason) => {
    const fallback = {enabled: false}
    // Rejections from external promises are not necessarily Error instances.
    // eslint-disable-next-line prefer-promise-reject-errors
    const rejected = Promise.reject(reason)
    expect(await withPromiseFallback(rejected, fallback)).toBe(fallback)
  },
)
