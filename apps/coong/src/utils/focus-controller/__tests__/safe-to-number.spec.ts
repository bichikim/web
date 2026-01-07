import {describe, expect, it} from 'vitest'
import {safeToNumber} from '../safe-to-number'

describe('safeToNumber', () => {
  it('should convert valid number string to number', () => {
    expect(safeToNumber('123')).toBe(123)
    expect(safeToNumber('0')).toBe(0)
    expect(safeToNumber('-456')).toBe(-456)
  })

  it('should convert decimal string to number', () => {
    expect(safeToNumber('123.45')).toBe(123.45)
    expect(safeToNumber('-0.5')).toBe(-0.5)
    expect(safeToNumber('0.001')).toBe(0.001)
  })

  it('should return null when value is NaN and failValue is not provided', () => {
    expect(safeToNumber('abc')).toBeNull()
    expect(safeToNumber('not a number')).toBeNull()
    expect(safeToNumber('xyz')).toBeNull()
  })

  it('should return custom failValue when value is NaN', () => {
    expect(safeToNumber('abc', 0)).toBe(0)
    expect(safeToNumber('xyz', -1)).toBe(-1)
    expect(safeToNumber('invalid', 999)).toBe(999)
  })

  it('should convert empty string to 0', () => {
    expect(safeToNumber('')).toBe(0)
    expect(safeToNumber('', null)).toBe(0)
  })

  it('should handle string representations of special numbers', () => {
    expect(safeToNumber('Infinity')).toBe(Infinity)
    expect(safeToNumber('-Infinity')).toBe(-Infinity)
  })

  it('should handle string with leading/trailing whitespace', () => {
    expect(safeToNumber('  123  ')).toBe(123)
    expect(safeToNumber('  -456  ')).toBe(-456)
  })

  it('should handle scientific notation strings', () => {
    expect(safeToNumber('1e2')).toBe(100)
    expect(safeToNumber('1.5e-2')).toBe(0.015)
  })

  it('should return null for null failValue when value is NaN', () => {
    expect(safeToNumber('invalid', null)).toBeNull()
  })
})

