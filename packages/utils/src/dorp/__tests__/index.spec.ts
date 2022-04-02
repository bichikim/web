import {drop} from '../'

describe('drop', () => {
  it('should drop array items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = drop(2)(target)
    expect(result).toEqual([3, 4, 5])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
