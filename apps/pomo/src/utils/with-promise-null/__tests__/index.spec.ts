import {expect, it} from 'vitest'
import {withPromiseNull} from '..'

it('should preserve successful values', async () => {
  const value = {enabled: true}
  expect(await withPromiseNull(Promise.resolve(value))).toBe(value)
  expect(await withPromiseNull(Promise.resolve(undefined))).toBeUndefined()
})

it('should resolve to null after a pending promise rejects', async () => {
  const pending = Promise.withResolvers<number>()
  const result = withPromiseNull(pending.promise)
  pending.reject(new Error('failed'))
  expect(await result).toBeNull()
})
