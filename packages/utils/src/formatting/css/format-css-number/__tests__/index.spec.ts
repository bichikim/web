import {describe, expect, it} from 'vitest'
import {formatCssNumber} from '../'

describe('formatCssNumber', () => {
  it('should round to the default two decimal places', () => {
    expect(formatCssNumber(123.456789)).toBe('123.46')
    expect(formatCssNumber(123.454)).toBe('123.45')
    expect(formatCssNumber(123.455)).toBe('123.46')
  })

  it('should round to the given decimal places', () => {
    expect(formatCssNumber(123.456789, 3)).toBe('123.457')
    expect(formatCssNumber(123.56, 0)).toBe('124')
    expect(formatCssNumber(0.30000000000000004, 1)).toBe('0.3')
  })

  it('should return integers unchanged when already exact', () => {
    expect(formatCssNumber(42)).toBe('42')
    expect(formatCssNumber(123.45)).toBe('123.45')
  })

  it('should return zero for zero', () => {
    expect(formatCssNumber(0)).toBe('0')
    expect(formatCssNumber(-0)).toBe('0')
  })

  it('should round negative numbers', () => {
    expect(formatCssNumber(-123.456789)).toBe('-123.46')
    expect(formatCssNumber(-0.616)).toBe('-0.62')
  })

  it('should return undefined for non-finite values', () => {
    expect(formatCssNumber(NaN)).toBeUndefined()
    expect(formatCssNumber(Number.POSITIVE_INFINITY)).toBeUndefined()
    expect(formatCssNumber(Number.NEGATIVE_INFINITY)).toBeUndefined()
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 1.5, 309])(
    'should return undefined for invalid decimal places %s',
    (decimalPlaces) => {
      expect(formatCssNumber(1, decimalPlaces)).toBeUndefined()
    },
  )

  it('should return undefined when rounding overflows', () => {
    expect(formatCssNumber(Number.MAX_VALUE, 3)).toBeUndefined()
  })
})
