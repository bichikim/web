import {MAX_CODE_BYTES, MAX_DRAFT_BYTES} from '../shared/editing-limits'
import {type CodeSource, failure, type Result, success} from '../shared/contracts'
import {isNavigableFile} from '../shared/is-navigable-file'
import {resolveFile} from './file-access'

/** Resolves existing workspace navigation drafts to canonical paths within the analysis size limit. */
export const readCodeSources = (
  root: string,
  sources: readonly CodeSource[],
): Result<ReadonlyMap<string, string>> => {
  const entries = sources.map(({path, source}) => {
    const file = resolveFile(root, path)
    if (!file.ok) {
      return file
    }
    if (!isNavigableFile(file.value) || source.includes('\0')) {
      return failure('unsupported-file')
    }
    if (Buffer.byteLength(source, 'utf8') > MAX_CODE_BYTES) {
      return failure('too-large')
    }
    return success([file.value, source] as const)
  })
  const error = entries.find((entry) => !entry.ok)
  if (error !== undefined && !error.ok) {
    return error
  }
  if (
    sources.reduce((size, entry) => size + Buffer.byteLength(entry.source, 'utf8'), 0) >
    MAX_DRAFT_BYTES
  ) {
    return failure('too-large')
  }
  return success(new Map(entries.flatMap((entry) => (entry.ok ? [entry.value] : []))))
}
