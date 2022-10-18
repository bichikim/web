import {stringArray} from '../'

describe('stringArray', () => {
  it('should return an empty array when given an empty string', () => {
    expect(stringArray('')).toEqual([])
  })
  it('should return array from a string', () => {
    expect(stringArray('foo')).toEqual(['f', 'o', 'o'])
  })
})
