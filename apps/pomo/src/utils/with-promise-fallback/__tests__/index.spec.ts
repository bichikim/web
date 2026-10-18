import {describe, expect, it} from 'vitest'
import {withPromiseFallback} from '..'

describe('withPromiseFallback', () => {
  it('should resolve to null after a pending promise rejects when null is the fallback', async () => {
    const pending = Promise.withResolvers<number>()
    const result = withPromiseFallback(pending.promise, null)
    pending.reject(new Error('failed'))
    expect(await result).toBeNull()
  })

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
      // 외부 Promise의 거부 사유가 반드시 Error 인스턴스인 것은 아니다.
      // eslint-disable-next-line prefer-promise-reject-errors
      const rejected = Promise.reject(reason)
      expect(await withPromiseFallback(rejected, fallback)).toBe(fallback)
    },
  )
})
