import {chunkOp} from '../'
import {describe, expect, it} from 'vitest'

describe('chunkOp', () => {
  it('should chunk list (curry)', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8]

    expect(chunkOp(2)(list)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ])
  })

  it('should chunk list', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8]

    expect(chunkOp(2, list)).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ])
  })
})
