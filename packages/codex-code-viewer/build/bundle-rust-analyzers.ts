import {createHash} from 'node:crypto'
import {chmod, mkdir, readFile, writeFile} from 'node:fs/promises'
import {gunzipSync} from 'node:zlib'
import {unzipSync} from 'fflate'
interface RustAnalyzerAsset {
  readonly host: string
  readonly archive: string
  readonly sha256: string
}
interface BundleRustAnalyzersOptions {
  readonly output: string
  readonly version: string
  readonly assets: readonly RustAnalyzerAsset[]
}

/** Bundles pinned, checksum-verified native analyzers for supported desktop hosts. */
export const bundleRustAnalyzers = async (options: BundleRustAnalyzersOptions): Promise<void> => {
  const EXECUTABLE_MODE = 0o755
  await Promise.all(
    options.assets.map(async (asset) => {
      const directory = `${options.output}/rust/${asset.host}`
      const cache = `${directory}/${options.version}`
      const compressed = `${cache}/${asset.archive}`
      let bytes: Uint8Array
      try {
        bytes = await readFile(compressed)
      } catch {
        const response = await fetch(
          `https://github.com/rust-lang/rust-analyzer/releases/download/${options.version}/${asset.archive}`,
        )
        if (!response.ok) {
          throw new Error(`Cannot download Rust analyzer: ${response.status} ${asset.archive}`)
        }
        bytes = new Uint8Array(await response.arrayBuffer())
      }
      if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) {
        throw new Error(`Rust analyzer checksum mismatch: ${asset.archive}`)
      }
      const windows = asset.host.startsWith('win32-')
      const binary = windows ? 'rust-analyzer.exe' : 'rust-analyzer'
      const executable = windows
        ? unzipSync(bytes, {filter: (entry) => entry.name === binary})[binary]
        : gunzipSync(bytes)
      if (executable === undefined) {
        throw new Error(`Missing executable in ${asset.archive}`)
      }
      await mkdir(cache, {recursive: true})
      await writeFile(compressed, bytes)
      await writeFile(`${directory}/${binary}`, executable)
      await chmod(`${directory}/${binary}`, EXECUTABLE_MODE)
    }),
  )
}
