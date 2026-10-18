import {closeSync, constants, fstatSync, openSync, readSync, realpathSync} from 'node:fs'
import {basename, relative, resolve, sep} from 'node:path'
import {MAX_ATTACHMENT_BYTES} from '../shared/chat-attachment'
import {failure, type Result, success} from '../shared/contracts'
import {isWithin} from './file-access'
import {isBrowsablePath} from './is-browsable-path'

interface AttachmentFile {
  readonly bytes: Buffer
  readonly filename: string
}

/** Reads one bounded regular workspace file without changing its name or bytes. */
export const readAttachmentFile = (root: string, path: string): Result<AttachmentFile> => {
  const candidate = resolve(root, path)
  if (
    !isWithin(root, candidate) ||
    !isBrowsablePath(relative(root, candidate).split(sep).join('/'))
  ) {
    return failure('outside-workspace')
  }
  let descriptor: number | undefined
  try {
    if (realpathSync(candidate) !== candidate) {
      return failure('outside-workspace')
    }
    descriptor = openSync(candidate, constants.O_RDONLY + constants.O_NOFOLLOW)
    const stats = fstatSync(descriptor)
    if (!stats.isFile()) {
      return failure('unsupported-file')
    }
    if (stats.size > MAX_ATTACHMENT_BYTES) {
      return failure('too-large')
    }
    const bytes = Buffer.alloc(stats.size + 1)
    let length = 0
    while (length < bytes.length) {
      const count = readSync(descriptor, bytes, {
        length: bytes.length - length,
        offset: length,
        position: length,
      })
      if (count === 0) {
        break
      }
      length += count
    }
    const after = fstatSync(descriptor)
    if (length !== stats.size || after.size !== stats.size || after.mtimeMs !== stats.mtimeMs) {
      return failure('stale-document')
    }
    return success({bytes: bytes.subarray(0, length), filename: basename(candidate)})
  } catch {
    return failure('read-failed')
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor)
    }
  }
}
