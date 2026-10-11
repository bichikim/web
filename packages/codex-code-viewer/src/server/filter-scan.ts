import type {ScanBatch} from '../shared/contracts'

/** Filters paths, omitting unrelated search batches while completing returned directories and reporting failures. */
export async function* filterScan(
  source: AsyncIterable<ScanBatch>,
  query: string,
  openable = false,
): AsyncGenerator<ScanBatch> {
  const needle = query.toLowerCase()
  const matches = (path: string): boolean => path.toLowerCase().includes(needle)
  const pending = new Set<string>()
  for await (const batch of source) {
    const filtered = {
      ...batch,
      directories: batch.directories.filter(matches),
      files: batch.files.filter((file) => (!openable || file.openable) && matches(file.path)),
    }
    const included = filtered.directories.length > 0 || filtered.files.length > 0
    if (
      needle === '' ||
      included ||
      batch.failed ||
      (batch.complete && pending.has(batch.directory))
    ) {
      if (included && !batch.complete) {
        pending.add(batch.directory)
      }
      if (batch.complete) {
        pending.delete(batch.directory)
      }
      yield filtered
    }
  }
}
