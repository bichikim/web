import {chunk} from '../chunk'

describe('chunk', () => {
  it('should return a chunked array', () => {
    const target = [1, 2, 3, 4, 5]
    const result = chunk(2)(target)
    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })
})
