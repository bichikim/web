import {getSize} from '../index'

describe('pxSize', () => {
  it('should return number  size', () => {
    expect(getSize('10px')).toBe(10)
    expect(getSize('10p')).toBe(0)
    expect(getSize('10pxd')).toBe(0)
    expect(getSize('10px02')).toBe(0)
    expect(getSize('10')).toBe(10)
    expect(getSize(10)).toBe(10)
  })
})
