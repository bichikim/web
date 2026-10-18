import {watch} from 'node:fs'
import {mkdir, mkdtemp, realpath, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {createFileIndex} from '../../src/server/create-file-index'
import {filterScan} from '../../src/server/filter-scan'
import type {ScanBatch} from '../../src/shared/contracts'

const FILE_COUNT = 100000
const FOLDER_COUNT = 1000
const WRITE_CONCURRENCY = 64
const NANOSECONDS_PER_MS = 1e6

interface Measurement {
  readonly label: string
  readonly firstMs: number | null
  readonly totalMs: number
  readonly batches: number
  readonly files: number
  readonly directories: number
  readonly bytes: number
}

const populate = async (
  count: number,
  operation: (index: number) => Promise<unknown>,
): Promise<void> => {
  for (let offset = 0; offset < count; offset += WRITE_CONCURRENCY) {
    // oxlint-disable-next-line no-await-in-loop -- Bound filesystem setup concurrency independently of the measured scan.
    await Promise.all(
      Array.from({length: Math.min(WRITE_CONCURRENCY, count - offset)}, (_, index) =>
        operation(offset + index),
      ),
    )
  }
}

const measure = async (label: string, source: AsyncIterable<ScanBatch>): Promise<Measurement> => {
  const started = process.hrtime.bigint()
  let firstMs: number | null = null
  let batches = 0
  let files = 0
  let directories = 0
  let bytes = 0
  for await (const batch of source) {
    firstMs ??= Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MS
    batches += 1
    files += batch.files.length
    directories += batch.directories.length
    bytes += Buffer.byteLength(JSON.stringify(batch))
  }
  return {
    batches,
    bytes,
    directories,
    files,
    firstMs,
    label,
    totalMs: Number(process.hrtime.bigint() - started) / NANOSECONDS_PER_MS,
  }
}

const root = await realpath(await mkdtemp(join(tmpdir(), 'code-viewer-tree-benchmark-')))
const folders = Array.from({length: FOLDER_COUNT}, (_, index) => `folder-${index}`)
console.error(`Creating ${FILE_COUNT} fixture files in ${root}`)
try {
  await populate(FOLDER_COUNT, (index) => mkdir(join(root, folders[index])))
  await populate(FILE_COUNT, (index) =>
    writeFile(join(root, folders[index % FOLDER_COUNT], `file-${index}.ts`), ''),
  )
  const index = createFileIndex(root)
  const keeper = watch(root, () => undefined)
  const controller = new AbortController()
  const scope = ['', ...folders]
  const versions: Record<string, string> = {}
  async function* collectVersions(source: AsyncIterable<ScanBatch>): AsyncGenerator<ScanBatch> {
    for await (const batch of source) {
      if (batch.complete && batch.version !== undefined) {
        versions[batch.directory] = batch.version
      }
      yield batch
    }
  }
  try {
    index.observe(scope)
    const cold = await measure(
      'cold expanded tree',
      collectVersions(index.scan(scope, controller.signal)),
    )
    const warm = await measure(
      'unchanged expanded tree',
      collectVersions(index.scan(scope, controller.signal, versions)),
    )
    const stable = await measure(
      'unchanged after version synchronization',
      collectVersions(index.scan(scope, controller.signal, versions)),
    )
    await writeFile(join(root, folders[0], 'added.ts'), '')
    const changed = await measure(
      'one changed folder',
      collectVersions(index.scan(scope, controller.signal, versions)),
    )
    const search = await measure(
      'first search',
      filterScan(index.scan(undefined, controller.signal), 'file-1'),
    )
    const repeat = await measure(
      'repeat search',
      filterScan(index.scan(undefined, controller.signal), 'file-10'),
    )
    const rare = await measure(
      'single matching file search',
      filterScan(index.scan(undefined, controller.signal), 'file-10000.ts'),
    )
    console.log(
      JSON.stringify(
        {
          fileCount: FILE_COUNT,
          folderCount: FOLDER_COUNT,
          measurements: [cold, warm, stable, changed, search, repeat, rare],
        },
        null,
        2,
      ),
    )
  } finally {
    controller.abort()
    index.dispose()
    keeper.close()
  }
} finally {
  await rm(root, {force: true, recursive: true})
}
