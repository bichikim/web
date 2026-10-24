import {unzipSync} from 'fflate'
import {jsonObject} from './json-fields'

export const MAXIMUM_ARCHIVE_BYTES = 536_870_912
export const MAXIMUM_ENTRY_COUNT = 100_000

export interface CubismArchive {
  readonly entries: ReadonlyMap<string, Uint8Array>
  readJson(path: string): Record<string, unknown>
}

/** ZIP과 폴더에서 같은 상대 경로와 JSON 읽기를 사용한다. */
export const createCubismArchive = (files: ReadonlyMap<string, Uint8Array>): CubismArchive => {
  const entries = new Map<string, Uint8Array>()
  let size = 0
  for (const [name, bytes] of files) {
    const path = resolveCubismAsset('', name)
    if (entries.has(path)) {
      throw new Error(`Cubism asset path is duplicated: ${path}`)
    }
    size += bytes.length
    if (
      size > MAXIMUM_ARCHIVE_BYTES ||
      bytes.length > MAXIMUM_ARCHIVE_BYTES / 2 ||
      entries.size >= MAXIMUM_ENTRY_COUNT
    ) {
      throw new Error('Cubism archive exceeds the supported size')
    }
    entries.set(path, bytes)
  }
  return {
    entries,
    readJson: (path) => {
      const entry = entries.get(path)
      if (entry === undefined) {
        throw new Error(`Cubism asset is missing: ${path}`)
      }
      return jsonObject(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(entry)))
    },
  }
}

/** ZIP 내부 상대 경로를 해석하며 외부 URL과 아카이브 밖의 경로를 거부한다. */
export const resolveCubismAsset = (base: string, reference: string): string => {
  if (/^(?:[a-z][a-z\d+.-]*:|\/|\\)/iu.test(reference)) {
    throw new Error('Cubism assets must be relative archive paths')
  }
  const segments = base.split('/').slice(0, -1)
  for (const segment of reference.replaceAll('\\', '/').split('/')) {
    if (segment === '..') {
      if (segments.pop() === undefined) {
        throw new Error('Cubism asset path leaves the archive')
      }
    } else if (segment !== '.' && segment.length > 0) {
      segments.push(segment)
    }
  }
  return segments.join('/')
}

/** 메모리 안에서 크기가 제한된 Cubism SDK ZIP을 읽는다. */
export const readCubismArchive = (source: ArrayBuffer | Uint8Array): CubismArchive => {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  const maximumBytes = MAXIMUM_ARCHIVE_BYTES
  let size = 0
  let count = 0
  if (bytes.length > maximumBytes) {
    throw new Error('Cubism archive exceeds the supported size')
  }
  const unzipped = unzipSync(bytes, {
    filter: (file) => {
      size += file.originalSize
      count += 1
      if (
        file.originalSize > maximumBytes / 2 ||
        size > maximumBytes ||
        count > MAXIMUM_ENTRY_COUNT
      ) {
        throw new Error('Cubism archive exceeds the supported size')
      }
      return !file.name.endsWith('/')
    },
  })
  return createCubismArchive(new Map(Object.entries(unzipped)))
}
