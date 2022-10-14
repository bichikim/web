import {last} from '../'

describe('last', () => {
  it('should return last item in an array', () => {
    const target = [1, 2, 3, 4, 5]
    const result = last(target)
    expect(result).toBe(5)
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
