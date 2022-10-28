import {getPxSize} from '../index'

describe('pxSize', () => {
  it('should return number  size', () => {
    expect(getPxSize('10px')).toBe(10)
    expect(getPxSize('10p')).toBe(0)
    expect(getPxSize('10pxd')).toBe(0)
    expect(getPxSize('10px02')).toBe(0)
    expect(getPxSize('10')).toBe(10)
    expect(getPxSize(10)).toBe(10)
  })
})
