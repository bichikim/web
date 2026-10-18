import {createHash} from 'node:crypto'
import {mkdir, mkdtemp, readFile, rename, rm, writeFile} from 'node:fs/promises'
import {extractTypescriptFiles} from '../src/server/analyzers/extract-typescript-files'

interface TypescriptAsset {
  readonly host: string
  readonly integrity: string
}
interface BundleTypescriptOptions {
  readonly output: string
  readonly version: string
  readonly assets: readonly TypescriptAsset[]
}
/** Bundles pinned native TypeScript executables and SDK declarations for desktop hosts. */
export const bundleTypescriptAnalyzers = async ({
  assets,
  output,
  version,
}: BundleTypescriptOptions): Promise<void> => {
  const EXECUTABLE_MODE = 0o755
  const CONTENT_MODE = 0o644
  await Promise.all(
    assets.map(async ({host, integrity}) => {
      const directory = `${output}/typescript/${host}`
      const cache = `${directory}/${version}.tgz`
      const bytes = await readFile(cache).catch(async (error: unknown) => {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
          throw error
        }
        const response = await fetch(
          `https://registry.npmjs.org/@typescript/typescript-${host}/-/typescript-${host}-${version}.tgz`,
        )
        if (!response.ok) {
          throw new Error(`Cannot download TypeScript analyzer: ${response.status} ${host}`)
        }
        return Buffer.from(await response.arrayBuffer())
      })
      if (`sha512-${createHash('sha512').update(bytes).digest('base64')}` !== integrity) {
        throw new Error(`TypeScript analyzer checksum mismatch: ${host}`)
      }
      const files = extractTypescriptFiles(bytes)
      const binary = host.startsWith('win32-') ? 'tsc.exe' : 'tsc'
      if (!files.has(binary) || !files.has('lib.d.ts')) {
        throw new Error(`Missing TypeScript binary or SDK: ${host}`)
      }
      await mkdir(directory, {recursive: true})
      await writeFile(cache, bytes)
      const staged = await mkdtemp(`${directory}/.staged-`)
      try {
        await Promise.all(
          [...files].map(async ([name, content]) => {
            const path = `${staged}/${name}`
            await writeFile(path, content, {mode: name === binary ? EXECUTABLE_MODE : CONTENT_MODE})
            await rename(path, `${directory}/${name}`)
          }),
        )
      } finally {
        await rm(staged, {force: true, recursive: true})
      }
    }),
  )
}
