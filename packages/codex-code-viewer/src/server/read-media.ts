import {closeSync, fstatSync, openSync, readSync} from 'node:fs'
import {failure, type Result, success} from '../shared/contracts'
import {mediaRevision, readMediaInfo} from './read-media-info'

const CHUNK_BYTES = 262144
interface ReadMediaOptions {
  root: string
  path: string
  revision: string
  offset: number
  length?: number
}
interface MediaChunk {
  readonly data: string
  readonly next: number
}
export const readMedia = (options: ReadMediaOptions): Result<MediaChunk> => {
  const {root, path, revision, offset, length = CHUNK_BYTES} = options
  const info = readMediaInfo(root, path)
  if (!info.ok) {
    return info
  }
  if (info.value.revision !== revision) {
    return failure('stale-document')
  }
  if (
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > info.value.media.size ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > CHUNK_BYTES
  ) {
    return failure('invalid-position')
  }
  let descriptor: number | undefined
  try {
    descriptor = openSync(info.value.path, 'r')
    if (mediaRevision(fstatSync(descriptor)) !== revision) {
      return failure('stale-document')
    }
    const bytes = Buffer.alloc(Math.min(length, info.value.media.size - offset))
    const count = readSync(descriptor, bytes, 0, bytes.length, offset)
    if (mediaRevision(fstatSync(descriptor)) !== revision) {
      return failure('stale-document')
    }
    return success({data: bytes.subarray(0, count).toString('base64'), next: offset + count})
  } catch {
    return failure('read-failed')
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor)
    }
  }
}
