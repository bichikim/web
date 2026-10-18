import type {ScanBatch} from '../shared/contracts'

/** Combines queued chunks per directory, preserving discovery order and terminal metadata. */
export const mergeScanBatches = (batches: readonly ScanBatch[]): ScanBatch[] => {
  const directories = new Map<string, ScanBatch[]>()
  for (const batch of batches) {
    const pending = directories.get(batch.directory)
    if (pending === undefined) {
      directories.set(batch.directory, [batch])
    } else {
      pending.push(batch)
    }
  }
  return [...directories.values()].map((chunks) => ({
    ...chunks[chunks.length - 1],
    directories: chunks.flatMap((chunk) => chunk.directories),
    failed: chunks.some((chunk) => chunk.failed),
    files: chunks.flatMap((chunk) => chunk.files),
  }))
}
