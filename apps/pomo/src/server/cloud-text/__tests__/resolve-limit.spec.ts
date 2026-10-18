import {expect, it} from 'vitest'
import {resolveCloudTextLimit} from '../resolve-limit'

it('should retain the free default when no configured product grants apply', () => {
  expect(resolveCloudTextLimit({productLimits: []})).toBe(3)
})
it('should choose the highest active product allowance without adding grants together', () => {
  expect(resolveCloudTextLimit({productLimits: [10, 30, 10]})).toBe(30)
})
it('should treat a null product allowance as unlimited', () => {
  expect(resolveCloudTextLimit({productLimits: [10, null, 30]})).toBeNull()
})
it('should apply administrator overrides before any purchased product policy', () => {
  expect(resolveCloudTextLimit({override: 0, productLimits: [null]})).toBe(0)
  expect(resolveCloudTextLimit({override: 5, productLimits: [30]})).toBe(5)
  expect(resolveCloudTextLimit({override: null, productLimits: [10]})).toBeNull()
})
