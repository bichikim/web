import {readIndexedSource} from './read-indexed-source'
import type {IndexedSource} from './types'
import type {SourceChange} from '../types'

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
  readonly change: SourceChange | null
}
const BATCH_SIZE = 32
const sourceChange = (
  path: string,
  previous: IndexedSource | undefined,
  source: IndexedSource | null,
): SourceChange | null => {
  if (previous?.revision === source?.revision) {
    return null
  }
  return {kind: source === null ? 'deleted' : previous === undefined ? 'created' : 'changed', path}
}

/** Yields source updates in bounded I/O batches using existing metadata checkpoints. */
export async function* readSourceUpdates(
  options: SourceUpdateOptions,
): AsyncGenerator<SourceUpdate> {
  for (let offset = 0; offset < options.paths.length; offset += BATCH_SIZE) {
    options.signal.throwIfAborted()
    // oxlint-disable-next-line no-await-in-loop -- Bound content reads while yielding to I/O between batches.
    const updates = await Promise.all(
      options.paths.slice(offset, offset + BATCH_SIZE).map(async (path) => {
        const previous = options.sources.get(path)
        const source = await readIndexedSource({
          generation: options.generation,
          path,
          previous,
          root: options.root,
          signal: options.signal,
        })
        return {change: sourceChange(path, previous, source), path, source}
      }),
    )
    // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
    yield* updates
  }
}
