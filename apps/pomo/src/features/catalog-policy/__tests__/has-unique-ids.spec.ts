import {expect, it} from 'vitest'
import {hasUniqueIds} from '..'

it('should accept empty and distinct ids without normalizing their spelling', () => {
  expect(hasUniqueIds([])).toBe(true)
  expect(hasUniqueIds(['a', 'A', ' a', ''])).toBe(true)
})

it('should reject duplicate ids without modifying input order', () => {
  const ids = ['b', 'a', 'b'] as const
  expect(hasUniqueIds(ids)).toBe(false)
  expect(ids).toEqual(['b', 'a', 'b'])
})
