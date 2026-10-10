import type {ScanBatch} from '../shared/contracts'

/** Filters streamed paths while preserving directory completion and failure signals. */
export async function* filterScan(
  source: AsyncIterable<ScanBatch>,
  query: string,
  openable = false,
): AsyncGenerator<ScanBatch> {
  const needle = query.toLowerCase()
  const matches = (path: string): boolean => path.toLowerCase().includes(needle)
  for await (const batch of source) {
    yield {
      ...batch,
      directories: batch.directories.filter(matches),
      files: batch.files.filter((file) => (!openable || file.openable) && matches(file.path)),
    }
  }
}
