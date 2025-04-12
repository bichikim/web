import {describe, expect, it} from 'vitest'
import {noNaN} from '../'

describe('no-nan', () => {
  it('should return 0 if value is NaN', () => {
    expect(noNaN(Number.NaN)).toBe(0)
  })

  it('should return value if value is not NaN', () => {
    expect(noNaN(123)).toBe(123)
  })

  it('should return failValue if value is NaN', () => {
    expect(noNaN(Number.NaN, 123)).toBe(123)
  })

  it('should return failValue if value is not NaN', () => {
    expect(noNaN(123, 0)).toBe(123)
  })
})
