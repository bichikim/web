import {describe, expect, it} from 'vitest'
import {getPxSize} from '../index'

describe('getSize', () => {
  it('should return number size with number', () => {
    expect(getPxSize(100)).toBe(100)
    expect(getPxSize(100.1)).toBe(100.1)
  })

  it('should return number size with number string', () => {
    expect(getPxSize('100')).toBe(100)
  })

  it('should return number size with ??px size string', () => {
    expect(getPxSize('100px')).toBe(100)
  })

  it('should return number size with ??.?px size string', () => {
    expect(getPxSize('100.1px')).toBe(100.1)
  })

  it('should return number size with .??px size string', () => {
    expect(getPxSize('.1px')).toBe(0.1)
  })

  it('should return number size with space', () => {
    expect(getPxSize('  100px ')).toBe(100)
  })

  it('should return failBakeValue with unknown size', () => {
    expect(getPxSize('  fa ', 10)).toBe(10)
  })
})
