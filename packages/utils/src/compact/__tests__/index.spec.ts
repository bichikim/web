import {compact} from '../'

describe('compact', () => {
  it('should return a compacted array', () => {
    const target = [0, 1, 2, false, null, undefined, 5, 6, '']
    const result = compact(target)
    expect(result).toEqual([1, 2, 5, 6])
  })
})
