import {toStyleString} from '../'

describe('toStyleString', () => {
  it('should return string style with an object style', () => {
    expect(toStyleString({color: 'red'})).toBe('color:red;')
  })
  it('should return string style with a string style', () => {
    expect(toStyleString('color:red;')).toBe('color:red;')
  })
  it('should return string style with null', () => {
    expect(toStyleString(null)).toBe('')
  })
  it('should return string style with undefined', () => {
    expect(toStyleString(null)).toBe('')
  })
})
