import {MAX_CODE_BYTES} from '../shared/editing-limits'
import {createHash, randomUUID} from 'node:crypto'
import {
  closeSync,
  constants,
  copyFileSync,
  fchmodSync,
  fsyncSync,
  openSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {dirname, relative, resolve} from 'node:path'
import {type CodeDocument, failure, type Result, success} from '../shared/contracts'
import {isEditableFile} from '../shared/is-editable-file'
import {isWithin, readSource, resolveFile} from './file-access'
import {tokenizeDocument} from './tokenize-document'

interface WriteSourceOptions {
  readonly root: string
  readonly path: string
  readonly source: string
  readonly revision: string | null
}
const PERMISSION_BITS = 0o1000
const DEFAULT_FILE_MODE = 0o666
const revisionOf = (source: string): string => createHash('sha256').update(source).digest('hex')

const resolveMissingTarget = (options: WriteSourceOptions): Result<string> => {
  const target = resolve(options.root, options.path)
  if (!isWithin(options.root, target)) {
    return failure('outside-workspace')
  }
  const existing = resolveFile(options.root, options.path)
  if (existing.ok) {
    return failure('write-conflict')
  }
  if (existing.error.code !== 'not-found') {
    return existing
  }
  try {
    const parent = realpathSync(dirname(target))
    if (parent !== dirname(target)) {
      return failure('protected-entry')
    }
    return success(target)
  } catch {
    return failure('write-failed')
  }
}

const readWriteTarget = (options: WriteSourceOptions): Result<string> => {
  const file = resolveFile(options.root, options.path)
  if (!file.ok) {
    return file
  }
  // A supported alias must not allow replacing a different file format through a symlink.
  if (!isEditableFile(file.value)) {
    return failure('unsupported-file')
  }
  const current = readSource(options.root, file.value)
  if (!current.ok) {
    return current
  }
  if (revisionOf(current.value) !== options.revision) {
    return failure('write-conflict')
  }
  return file
}

/** Saves editable UTF-8 content against a revision, or exclusively creates a missing file for null. */
export const writeSource = (options: WriteSourceOptions): Result<CodeDocument> => {
  if (!isEditableFile(options.path) || options.source.includes('\0')) {
    return failure('unsupported-file')
  }
  if (Buffer.byteLength(options.source, 'utf8') > MAX_CODE_BYTES) {
    return failure('too-large')
  }
  const file = options.revision === null ? resolveMissingTarget(options) : readWriteTarget(options)
  if (!file.ok) {
    return file
  }
  const document: CodeDocument = {
    lines: tokenizeDocument(file.value, options.source),
    location: {column: 1, line: 1, path: relative(options.root, file.value)},
    revision: revisionOf(options.source),
    source: options.source,
  }
  const temporary = resolve(dirname(file.value), `.codex-edit-${randomUUID()}.tmp`)
  let descriptor: number | undefined
  let created = false
  try {
    const mode =
      options.revision === null ? DEFAULT_FILE_MODE : statSync(file.value).mode % PERMISSION_BITS
    descriptor = openSync(temporary, 'wx', mode)
    created = true
    writeFileSync(descriptor, options.source, 'utf8')
    if (options.revision !== null) {
      fchmodSync(descriptor, mode)
    }
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined
    if (options.revision === null) {
      copyFileSync(temporary, file.value, constants.COPYFILE_EXCL)
    } else {
      const destination = readWriteTarget(options)
      if (!destination.ok) {
        return destination
      }
      if (destination.value !== file.value) {
        return failure('write-conflict')
      }
      renameSync(temporary, file.value)
    }
    return success(document)
  } catch (error) {
    return failure(
      error instanceof Error && 'code' in error && error.code === 'EEXIST'
        ? 'write-conflict'
        : 'write-failed',
    )
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor)
    }
    if (created) {
      rmSync(temporary, {force: true})
    }
  }
}
