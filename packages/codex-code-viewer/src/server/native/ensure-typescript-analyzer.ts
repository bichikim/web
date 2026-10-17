import {createHash} from 'node:crypto'
import {chmod, readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {downloadArchive} from '../analyzers/download-archive'
import {extractTypescriptFiles} from '../analyzers/extract-typescript-files'
import {writeCacheFile} from '../analyzers/write-cache-file'

interface TypescriptAsset {
  /** 내려받을 운영체제와 CPU 조합이다. */
  readonly host: string
  /** 고정된 npm 압축 파일의 SHA-512 SRI 값이다. */
  readonly integrity: string
}
interface EnsureTypescriptOptions {
  /** 현재 호스트에 필요한 검증 정보를 지정한다. */
  readonly asset: TypescriptAsset
  /** 호출자가 소유하며 이후 실행에서도 재사용할 캐시 경로이다. */
  readonly cacheRoot: string
  /** 내려받을 분석기의 정확한 버전이다. */
  readonly version: string
}
const pending = new Map<string, Promise<string>>()
const digest = (bytes: Uint8Array): string => createHash('sha512').update(bytes).digest('base64')
const readCached = (path: string): Promise<Buffer | undefined> =>
  readFile(path).catch((error: unknown) => {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }
    throw error
  })

const prepare = async (options: EnsureTypescriptOptions, directory: string): Promise<string> => {
  const {asset, version} = options
  const archive = join(directory, 'archive.tgz')
  const cached = await readCached(archive)
  const verified = (bytes: Uint8Array): boolean => `sha512-${digest(bytes)}` === asset.integrity
  const bytes =
    cached !== undefined && verified(cached)
      ? cached
      : await downloadArchive(
          `https://registry.npmjs.org/@typescript/typescript-${asset.host}/-/typescript-${asset.host}-${version}.tgz`,
        )
  if (!verified(bytes)) {
    throw new Error(`TypeScript analyzer checksum mismatch: ${asset.host}`)
  }
  const files = extractTypescriptFiles(bytes)
  const binary = asset.host.startsWith('win32-') ? 'tsc.exe' : 'tsc'
  if (!files.has(binary) || !files.has('lib.d.ts')) {
    throw new Error(`Missing TypeScript binary or SDK: ${asset.host}`)
  }
  const EXECUTABLE_MODE = 0o755
  const CONTENT_MODE = 0o644
  await Promise.all(
    [...files].map(async ([name, content]) => {
      const path = join(directory, name)
      const current = await readCached(path)
      if (current === undefined || !current.equals(content)) {
        await writeCacheFile({
          bytes: content,
          mode: name === binary ? EXECUTABLE_MODE : CONTENT_MODE,
          path,
        })
      }
    }),
  )
  if (bytes !== cached) {
    await writeCacheFile({bytes, mode: CONTENT_MODE, path: archive})
  }
  const path = join(directory, binary)
  await chmod(path, EXECUTABLE_MODE)
  return path
}

/** 현재 호스트의 분석기와 SDK를 검증해 캐시하고 손상된 파일을 복구한다. */
export const ensureTypescriptAnalyzer = (options: EnsureTypescriptOptions): Promise<string> => {
  const directory = join(
    options.cacheRoot,
    options.version,
    options.asset.host,
    createHash('sha256').update(options.asset.integrity).digest('hex'),
  )
  const existing = pending.get(directory)
  if (existing !== undefined) {
    return existing
  }
  const result = prepare(options, directory).finally(() => pending.delete(directory))
  pending.set(directory, result)
  return result
}
