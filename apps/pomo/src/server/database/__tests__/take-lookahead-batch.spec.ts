import {expect, it} from 'vitest'
import {takeLookaheadBatch} from '../take-lookahead-batch'

it('should distinguish the lookahead row from the processing batch', () => {
  const options = {batchSize: 2, label: 'Cleanup'}
  expect(takeLookaheadBatch([], options)).toEqual({batch: [], complete: true})
  expect(takeLookaheadBatch([1, 2], options)).toEqual({batch: [1, 2], complete: true})
  expect(takeLookaheadBatch([1, 2, 3], options)).toEqual({batch: [1, 2], complete: false})
  expect(() => takeLookaheadBatch([1, 2, 3, 4], options)).toThrow(
    new RangeError('Cleanup repository exceeded the requested limit'),
  )
})
