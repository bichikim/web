import {map} from '../map'

describe('map', () => {
  it('should map list', () => {
    const result = map((item: number) => item + 1)([1, 2, 3])
    expect(result).toEqual([2, 3, 4])
  })
})
