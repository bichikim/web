import {statSync} from 'node:fs'
import {setImmediate} from 'node:timers/promises'
import {fileRevision} from '../file-revision'

const BATCH_SIZE = 256

/** Reads every input revision in bounded batches, retaining missing paths and cancellation. */
export const readPathRevisions = async (
  paths: readonly string[],
  signal: AbortSignal,
): Promise<ReadonlyMap<string, string | null>> => {
  const revisions = new Map<string, string | null>()
  for (let offset = 0; offset < paths.length; offset += BATCH_SIZE) {
    signal.throwIfAborted()
    for (const path of paths.slice(offset, offset + BATCH_SIZE)) {
      try {
        const stats = statSync(path, {bigint: true, throwIfNoEntry: false})
        revisions.set(path, stats === undefined ? null : fileRevision(stats))
      } catch {
        revisions.set(path, null)
      }
    }
    if (offset + BATCH_SIZE < paths.length) {
      // oxlint-disable-next-line no-await-in-loop -- Let cancellation and other queued work run between bounded metadata reads.
      await setImmediate()
    }
  }
  signal.throwIfAborted()
  return revisions
}
