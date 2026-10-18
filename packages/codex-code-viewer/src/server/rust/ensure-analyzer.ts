import {createHash} from 'node:crypto'
import {chmod, readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {gunzipSync} from 'node:zlib'
import {unzipSync} from 'fflate'
import {downloadArchive} from '../analyzers/download-archive'
import {writeCacheFile} from '../analyzers/write-cache-file'

interface AnalyzerAsset {
  readonly host: string
  readonly archive: string
  readonly sha256: string
}
interface EnsureAnalyzerOptions {
  readonly asset: AnalyzerAsset
  readonly cacheRoot: string
  readonly version: string
}
const EXECUTABLE_MODE = 0o755
const ARCHIVE_MODE = 0o644
const pending = new Map<string, Promise<string>>()
const digest = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')
const readCached = (path: string): Promise<Buffer | undefined> =>
  readFile(path).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  })

const prepare = async (options: EnsureAnalyzerOptions, directory: string): Promise<string> => {
  const {asset} = options
  const archive = join(directory, asset.archive)
  const cached = await readCached(archive)
  const compressed =
    cached !== undefined && digest(cached) === asset.sha256
      ? cached
      : await downloadArchive(
          `https://github.com/rust-lang/rust-analyzer/releases/download/${options.version}/${asset.archive}`,
        )
  if (digest(compressed) !== asset.sha256) {
    throw new Error(`Rust analyzer checksum mismatch: ${asset.archive}`)
  }
  const windows = asset.host.startsWith('win32-')
  const binary = windows ? 'rust-analyzer.exe' : 'rust-analyzer'
  const executable = windows
    ? unzipSync(compressed, {filter: (entry) => entry.name === binary})[binary]
    : gunzipSync(compressed)
  if (executable === undefined) {
    throw new Error(`Missing executable in ${asset.archive}`)
  }
  const path = join(directory, binary)
  const current = await readCached(path)
  if (cached !== compressed) {
    await writeCacheFile({bytes: compressed, mode: ARCHIVE_MODE, path: archive})
  }
  if (current === undefined || !current.equals(executable)) {
    await writeCacheFile({bytes: executable, mode: EXECUTABLE_MODE, path})
  }
  await chmod(path, EXECUTABLE_MODE)
  return path
}

/** Resolves a checksum-verified cached analyzer, downloading only on a cache miss or corruption. */
export const ensureAnalyzer = (options: EnsureAnalyzerOptions): Promise<string> => {
  const directory = join(
    options.cacheRoot,
    options.version,
    options.asset.host,
    options.asset.sha256,
  )
  const existing = pending.get(directory)
  if (existing !== undefined) {
    return existing
  }
  const result = prepare(options, directory).finally(() => pending.delete(directory))
  pending.set(directory, result)
  return result
}
