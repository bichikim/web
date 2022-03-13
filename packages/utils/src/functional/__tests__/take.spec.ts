import {take} from '../take'

describe('take', () => {
  it('should return 2 items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = take(2)(target)
    expect(result).toEqual([1, 2])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
