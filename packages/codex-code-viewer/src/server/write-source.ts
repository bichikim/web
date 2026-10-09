import {MAX_CODE_BYTES} from '../shared/editing-limits'
import {createHash, randomUUID} from 'node:crypto'
import {
  closeSync,
  fchmodSync,
  fsyncSync,
  openSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {dirname, relative, resolve} from 'node:path'
import {type CodeDocument, failure, type Result, success} from '../shared/contracts'
import {isEditableFile} from '../shared/is-editable-file'
import {readSource, resolveFile} from './file-access'
import {tokenizeDocument} from './tokenize-document'

interface WriteSourceOptions {
  readonly root: string
  readonly path: string
  readonly source: string
  readonly revision: string
}
const PERMISSION_BITS = 0o1000
const revisionOf = (source: string): string => createHash('sha256').update(source).digest('hex')

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

/** Replaces an editable UTF-8 file when its current content matches the supplied revision. */
export const writeSource = (options: WriteSourceOptions): Result<CodeDocument> => {
  if (!isEditableFile(options.path) || options.source.includes('\0')) {
    return failure('unsupported-file')
  }
  if (Buffer.byteLength(options.source, 'utf8') > MAX_CODE_BYTES) {
    return failure('too-large')
  }
  const file = readWriteTarget(options)
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
    const mode = statSync(file.value).mode % PERMISSION_BITS
    descriptor = openSync(temporary, 'wx', mode)
    created = true
    writeFileSync(descriptor, options.source, 'utf8')
    fchmodSync(descriptor, mode)
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined
    const destination = readWriteTarget(options)
    if (!destination.ok) {
      return destination
    }
    if (destination.value !== file.value) {
      return failure('write-conflict')
    }
    renameSync(temporary, file.value)
    return success(document)
  } catch {
    return failure('write-failed')
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor)
    }
    if (created) {
      rmSync(temporary, {force: true})
    }
  }
}
