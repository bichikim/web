import {map, mapFn} from '../'

describe('mapFn', () => {
  it('should map list', () => {
    const result = mapFn((item: number) => item + 1)([1, 2, 3])
    expect(result).toEqual([2, 3, 4])
  })
})

describe('map', () => {
  it('should map list', () => {
    const result = map([1, 2, 3], (item: number) => item + 1)
    expect(result).toEqual([2, 3, 4])
  })
})
