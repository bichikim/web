import type {BatchDeletionResult} from './delete-locked-batch'

export interface DrainLockedBatchesOptions {
  readonly deleteBatch: () => Promise<BatchDeletionResult>
  readonly batchSize: number
  readonly maximumBatches: number
  readonly invalidCountMessage: string
}
export interface DrainLockedBatchesResult {
  readonly complete: boolean
  readonly deleted: number
}

/** Drains sequential deletion batches within a fixed budget and validates repository counts. */
export const drainLockedBatches = async (
  options: DrainLockedBatchesOptions,
): Promise<DrainLockedBatchesResult> => {
  let deleted = 0
  for (let batch = 0; batch < options.maximumBatches; batch += 1) {
    // Each batch depends on the durable rows left by the preceding deletion.
    // oxlint-disable-next-line no-await-in-loop
    const result = await options.deleteBatch()
    if (
      result.deleted < 0 ||
      result.deleted > options.batchSize ||
      (result.hasMore && result.deleted !== options.batchSize)
    ) {
      throw new RangeError(options.invalidCountMessage)
    }
    deleted += result.deleted
    if (!result.hasMore) {
      return {complete: true, deleted}
    }
  }
  return {complete: false, deleted}
}
