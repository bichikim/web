import {toArray} from '../'

describe('to-array', () => {
  it('should return an array always with an array', () => {
    const result = toArray(['foo'])
    expect(result).toEqual(['foo'])
  })
  it('should return an array always with an array', () => {
    const result = toArray('foo')
    expect(result).toEqual(['foo'])
  })
  it('should return an array always with an array', () => {
    const result = toArray()
    expect(result).toEqual([])
  })
  it('should return an array always with an array', () => {
    const result = toArray(null)
    expect(result).toEqual([])
  })
})
