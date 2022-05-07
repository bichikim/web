import {chunk, chunkFn} from '../'

describe('chunkFn', () => {
  it('should return a chunked array', () => {
    const target = [1, 2, 3, 4, 5]
    const result = chunkFn(2)(target)
    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe('chunk', () => {
  it('should return a chunked array', () => {
    const target = [1, 2, 3, 4, 5]
    const result = chunk(target, 2)
    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })
})
