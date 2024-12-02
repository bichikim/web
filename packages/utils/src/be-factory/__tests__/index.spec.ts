import {beFactory} from '../'
import {describe, expect, inject, it} from 'vitest'
import {chunk} from '@winter-love/lodash'

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
