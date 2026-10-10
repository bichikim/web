import {readIndexedSource} from './read-indexed-source'
import type {IndexedSource} from './types'

interface SourceUpdateOptions {
  readonly root: string
  readonly paths: readonly string[]
  readonly sources: ReadonlyMap<string, IndexedSource>
  readonly generation: number
  readonly signal: AbortSignal
}
interface SourceUpdate {
  readonly path: string
  readonly source: IndexedSource | null
}
const BATCH_SIZE = 32

/** Yields source updates in bounded I/O batches using existing metadata checkpoints. */
export async function* readSourceUpdates(
  options: SourceUpdateOptions,
): AsyncGenerator<SourceUpdate> {
  for (let offset = 0; offset < options.paths.length; offset += BATCH_SIZE) {
    options.signal.throwIfAborted()
    // oxlint-disable-next-line no-await-in-loop -- Bound content reads while yielding to I/O between batches.
    const updates = await Promise.all(
      options.paths.slice(offset, offset + BATCH_SIZE).map(async (path) => ({
        path,
        source: await readIndexedSource({
          generation: options.generation,
          path,
          previous: options.sources.get(path),
          root: options.root,
          signal: options.signal,
        }),
      })),
    )
    // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
    yield* updates
  }
}
