import {toNumber} from '../'
describe('to-number', () => {
  it('should return number with string number', () => {
    const result = toNumber('20')
    expect(result).toBe(20)
  })
  it('should return number with string but no number', () => {
    const result = toNumber('foo', 20)
    expect(result).toBe(20)
  })
  it('should return number with string but no number', () => {
    const result = toNumber(20)
    expect(result).toBe(20)
  })
})
