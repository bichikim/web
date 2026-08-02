import {chunk} from 'es-toolkit/array'
import {describe, expect, expectTypeOf, it} from 'vitest'
import {flipArgsFactory} from '../'

describe('flipArgsFactory', () => {
  it('should apply the first parameter after the remaining parameters', () => {
    const chunkFp = flipArgsFactory(chunk)
    const runChunk = chunkFp(2)

    expect(runChunk([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ])
  })

  it('should preserve parameter and return types', () => {
    const formatValue = (value: number, prefix: string, suffix?: string) => {
      return `${prefix}${value}${suffix ?? ''}`
    }

    const withAffixes = flipArgsFactory(formatValue)
    const runFormat = withAffixes('$', '!')

    expectTypeOf(withAffixes).parameters.toEqualTypeOf<[prefix: string, suffix?: string]>()
    expectTypeOf(runFormat).parameters.toEqualTypeOf<[value: number]>()
    expectTypeOf(runFormat).returns.toEqualTypeOf<string>()
    expect(runFormat(42)).toBe('$42!')
  })
})
