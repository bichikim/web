/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {ceilWeightedSum} from '..'

describe('ceilWeightedSum', () => {
  it.each([
    {expected: 0n, name: 'empty sum', products: []},
    {expected: 0n, name: 'zero multiplier', products: [{multiplier: 0, quantity: 10n}]},
    {expected: 0n, name: 'negative zero multiplier', products: [{multiplier: -0, quantity: 10n}]},
    {expected: 0n, name: 'zero quantity', products: [{multiplier: Number.MAX_VALUE, quantity: 0n}]},
    {expected: 7n, name: 'binary residue', products: [{multiplier: 0.07, quantity: 100n}]},
    {expected: 1n, name: 'fraction below one', products: [{multiplier: 0.1, quantity: 1n}]},
    {
      expected: 2n * 10n ** 21n,
      name: 'positive exponent',
      products: [{multiplier: 1e21, quantity: 2n}],
    },
    {expected: 1n, name: 'negative exponent', products: [{multiplier: 1e-7, quantity: 1000000n}]},
    {
      expected: 1n,
      name: 'smallest multiplier',
      products: [{multiplier: Number.MIN_VALUE, quantity: 1n}],
    },
    {
      expected: 17976931348623157n * 10n ** 292n,
      name: 'largest multiplier',
      products: [{multiplier: Number.MAX_VALUE, quantity: 1n}],
    },
    {
      expected: 4503599627370497n,
      name: 'arbitrary integer quantity',
      products: [{multiplier: 0.5, quantity: 9007199254740993n}],
    },
    {
      expected: 1n,
      name: 'sum before ceiling',
      products: [
        {multiplier: 0.1, quantity: 1n},
        {multiplier: 0.2, quantity: 1n},
      ],
    },
    {
      expected: 1n,
      name: 'exact sum boundary',
      products: [
        {multiplier: 0.1, quantity: 1n},
        {multiplier: 0.9, quantity: 1n},
      ],
    },
    {
      expected: 2n,
      name: 'above sum boundary',
      products: [
        {multiplier: 0.5001, quantity: 1n},
        {multiplier: 0.5, quantity: 1n},
      ],
    },
    {
      expected: 2n,
      name: 'tiny increment above integer',
      products: [
        {multiplier: 1, quantity: 1n},
        {multiplier: Number.MIN_VALUE, quantity: 1n},
      ],
    },
    {
      expected: 17976931348623157n * 10n ** 292n + 1n,
      name: 'tiny increment above largest term',
      products: [
        {multiplier: Number.MAX_VALUE, quantity: 1n},
        {multiplier: Number.MIN_VALUE, quantity: 1n},
      ],
    },
  ])('should ceil the $name exactly', ({products, expected}) => {
    expect(ceilWeightedSum({products})).toBe(expected)
  })

  it.each([-1, -Number.MIN_VALUE, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'should reject a multiplier outside the nonnegative finite contract: %s',
    (multiplier) => {
      expect(() => ceilWeightedSum({products: [{multiplier, quantity: 1n}]})).toThrow(RangeError)
    },
  )

  it('should reject a negative quantity even with a zero multiplier', () => {
    expect(() => ceilWeightedSum({products: [{multiplier: 0, quantity: -1n}]})).toThrow(RangeError)
  })

  it('should preserve frozen inputs and return the same result in either order', () => {
    const first = Object.freeze({multiplier: 0.07, quantity: 100n})
    const second = Object.freeze({multiplier: Number.MIN_VALUE, quantity: 1n})
    const products = Object.freeze([first, second])
    const options = Object.freeze({products})

    expect(ceilWeightedSum(options)).toBe(8n)
    expect(ceilWeightedSum(options)).toBe(8n)
    expect(ceilWeightedSum({products: [second, first]})).toBe(8n)
    expect(products).toEqual([
      {multiplier: 0.07, quantity: 100n},
      {multiplier: Number.MIN_VALUE, quantity: 1n},
    ])
  })
})
