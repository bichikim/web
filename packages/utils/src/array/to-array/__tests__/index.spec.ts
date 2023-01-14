import {expectType} from 'tsd'
import {toArray} from '../'

describe('to-array', () => {
  it('should return an array with an array argument', () => {
    const result = toArray(['foo'])
    expect(result).toEqual(['foo'])
  })
  it('should return an array with a string argument', () => {
    const result = toArray('foo')
    expect(result).toEqual(['foo'])
  })
  it('should return an array with undefined argument', () => {
    const result = toArray()
    expect(result).toEqual([])
  })
  it('should return an array with null argument', () => {
    const result = toArray<string>(null)
    expect(result).toEqual([])
    expectType<string[]>(result)
  })
})
