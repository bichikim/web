import {createMonotonicId} from '../'
import {describe, expect, it} from 'vitest'

describe('createMonotonicId', () => {
  it('should create a monotonic identifier generator', () => {
    const generateId = createMonotonicId()

    expect(generateId).toBeInstanceOf(Function)
    expect(generateId()).toBe(1)
    expect(generateId()).toBe(2)
    expect(generateId()).toBe(3)
  })

  it('should not collide after one million generated identifiers', () => {
    const generateId = createMonotonicId(1_000_000)

    expect(generateId()).toBe(1_000_001)
  })

  it('should create independent identifier generators', () => {
    const firstGenerator = createMonotonicId()
    const secondGenerator = createMonotonicId()

    expect(firstGenerator()).toBe(1)
    expect(firstGenerator()).toBe(2)
    expect(secondGenerator()).toBe(1)
    expect(secondGenerator()).toBe(2)
  })

  it('should never return negative numbers', () => {
    const generateId = createMonotonicId()
    const results = Array.from({length: 100}, () => generateId())

    expect(results.every((number_) => number_ > 0)).toBe(true)
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'should reject an invalid starting value %s',
    (startFrom) => {
      expect(() => createMonotonicId(startFrom)).toThrow(RangeError)
    },
  )

  it('should fail instead of returning an unsafe or duplicate identifier', () => {
    const generateId = createMonotonicId(Number.MAX_SAFE_INTEGER)

    expect(generateId).toThrow(RangeError)
  })
})
