import {toNumber} from '../'
describe('to-number', () => {
  it('should return number with a string number', () => {
    const result = toNumber('20')
    expect(result).toBe(20)
  })
  it('should return number with a string but no number', () => {
    const result = toNumber('foo', 20)
    expect(result).toBe(20)
  })
  it('should return number with a function but no number', () => {
    const result = toNumber(() => 'foo', 20)
    expect(result).toBe(20)
  })
  it('should return number with an object but no number', () => {
    const result = toNumber({name: 'foo'}, 20)
    expect(result).toBe(20)
  })
  it('should return number with a number', () => {
    const result = toNumber(20)
    expect(result).toBe(20)
  })
})
