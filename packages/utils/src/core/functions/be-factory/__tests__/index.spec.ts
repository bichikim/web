import {chunk} from 'es-toolkit/array'
import {describe, expect, it} from 'vitest'
import {beFactory} from '../'

describe('be-factory', () => {
  it('should be a function', () => {
    const chunkFp = beFactory(chunk)
    const runChunk = chunkFp(2)

    expect(runChunk([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ])
  })
})
