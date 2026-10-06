export interface TakeLookaheadBatchOptions {
  readonly batchSize: number
  readonly label: string
}

/** Validates a one-item lookahead and returns the bounded processing batch. */
export const takeLookaheadBatch = <Item>(
  items: ReadonlyArray<Item>,
  options: TakeLookaheadBatchOptions,
) => {
  if (items.length > options.batchSize + 1) {
    throw new RangeError(`${options.label} repository exceeded the requested limit`)
  }
  return {batch: items.slice(0, options.batchSize), complete: items.length <= options.batchSize}
}
