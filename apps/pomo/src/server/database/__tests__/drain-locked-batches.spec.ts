import {expect, it, vi} from 'vitest'
import {drainLockedBatches} from '../drain-locked-batches'

it('should stop on the final partial batch and report deleted rows', async () => {
  const deleteBatch = vi
    .fn()
    .mockResolvedValueOnce({deleted: 2, hasMore: true})
    .mockResolvedValueOnce({deleted: 1, hasMore: false})
  expect(
    await drainLockedBatches({
      batchSize: 2,
      deleteBatch,
      invalidCountMessage: 'invalid',
      maximumBatches: 3,
    }),
  ).toEqual({complete: true, deleted: 3})
  expect(deleteBatch).toHaveBeenCalledTimes(2)
})
it('should bound draining even when every batch has more rows', async () => {
  const deleteBatch = vi.fn().mockResolvedValue({deleted: 2, hasMore: true})
  expect(
    await drainLockedBatches({
      batchSize: 2,
      deleteBatch,
      invalidCountMessage: 'invalid',
      maximumBatches: 3,
    }),
  ).toEqual({complete: false, deleted: 6})
  expect(deleteBatch).toHaveBeenCalledTimes(3)
})
it.each([
  {deleted: -1, hasMore: false},
  {deleted: 3, hasMore: false},
  {deleted: 1, hasMore: true},
])('should reject inconsistent repository counts %j', async (result) => {
  await expect(
    drainLockedBatches({
      batchSize: 2,
      deleteBatch: async () => result,
      invalidCountMessage: 'invalid repository count',
      maximumBatches: 3,
    }),
  ).rejects.toThrow(new RangeError('invalid repository count'))
})
