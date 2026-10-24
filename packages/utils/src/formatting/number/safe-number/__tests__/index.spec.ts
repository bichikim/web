import {describe, expect, it} from 'vitest'
import {safeNumber} from '../'

describe('safeNumber', () => {
  it('should return 0 if value is NaN', () => {
    expect(safeNumber(Number.NaN)).toBe(0)
  })

  it('should return value if value is not NaN', () => {
    expect(safeNumber(123)).toBe(123)
  })

  it('should return failValue if value is NaN', () => {
    expect(safeNumber(Number.NaN, 123)).toBe(123)
  })

  it('should return failValue if value is not NaN', () => {
    expect(safeNumber(123, 0)).toBe(123)
  })
})
