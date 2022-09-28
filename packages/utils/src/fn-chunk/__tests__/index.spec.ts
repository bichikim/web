import {fnChunk} from '../'

describe('fnChunk', () => {
  it('should return a chunk', () => {
    const target = [1, 2, 3, 4, 5]
    const result = fnChunk(2)(target)
    expect(result).toEqual([[1, 2], [3, 4], [5]])
  })
})
