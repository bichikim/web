import {chunkFn} from '../'
describe('chunkFn', () => {
  it('should chunk list', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(chunkFn(2)(list)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ])
  })
})
