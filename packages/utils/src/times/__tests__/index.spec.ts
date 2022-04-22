import {times} from '../'

describe('times', () => {
  it('should call a function 10 times', () => {
    const result = times(10, (index) => index)
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
