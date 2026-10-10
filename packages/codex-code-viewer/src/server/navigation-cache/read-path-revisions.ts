import {stat} from 'node:fs/promises'
import {fileRevision} from '../file-revision'

const BATCH_SIZE = 64

/** Reads bounded metadata batches without loading file contents. */
export const readPathRevisions = async (
  paths: readonly string[],
  signal: AbortSignal,
): Promise<ReadonlyMap<string, string | null>> => {
  const revisions = new Map<string, string | null>()
  for (let offset = 0; offset < paths.length; offset += BATCH_SIZE) {
    signal.throwIfAborted()
    // oxlint-disable-next-line no-await-in-loop -- Bound metadata requests and yield to I/O between batches.
    const entries = await Promise.all(
      paths.slice(offset, offset + BATCH_SIZE).map(async (path) => {
        const revision = await stat(path, {bigint: true}).then(fileRevision, () => null)
        return [path, revision] as const
      }),
    )
    entries.forEach(([path, revision]) => revisions.set(path, revision))
  }
  signal.throwIfAborted()
  return revisions
}
