import {createHash} from 'node:crypto'
import {lstat, readdir} from 'node:fs/promises'
import {join} from 'node:path'
import {failure, type Result, success, type ViewerError} from '../../shared/contracts'
import {fileRevision} from '../file-revision'
import {resolveEntry} from './resolve-entry'
import type {EntryItem, EntrySnapshot, ReadEntryProps} from './types'

const PRIVATE_NAMES = new Set(['.git', '.codex', '.aws', '.ssh'])
const MAX_ENTRIES = 10000

/** Captures metadata for a file or complete directory, rejecting protected descendants and links. */
export const readEntry = async (props: ReadEntryProps): Promise<Result<EntrySnapshot>> => {
  const resolved = await resolveEntry(props)
  if (!resolved.ok) {
    return resolved
  }
  const entries: EntryItem[] = []
  const hash = createHash('sha256')
  const visit = async (path: string): Promise<ViewerError['code'] | null> => {
    if (entries.length >= MAX_ENTRIES) {
      return 'operation-too-large'
    }
    const stats = await lstat(join(resolved.value.absolute, path), {bigint: true})
    if (stats.isSymbolicLink() || (!stats.isFile() && !stats.isDirectory())) {
      return 'protected-entry'
    }
    const kind = stats.isDirectory() ? 'directory' : 'file'
    entries.push({kind, mode: Number(stats.mode), path})
    hash.update(JSON.stringify([path, fileRevision(stats)]))
    if (kind === 'directory') {
      const children = (await readdir(join(resolved.value.absolute, path))).sort()
      // Keep traversal and metadata hashing deterministic, stopping at the first failure.
      return children.reduce(async (previous, name) => {
        const error = await previous
        if (error !== null) {
          return error
        }
        return PRIVATE_NAMES.has(name)
          ? 'protected-entry'
          : visit(path === '' ? name : `${path}/${name}`)
      }, Promise.resolve<ViewerError['code'] | null>(null))
    }
    return null
  }
  try {
    const error = await visit('')
    return error === null
      ? success({...resolved.value, entries, revision: hash.digest('hex')})
      : failure(error)
  } catch {
    return failure('entry-changed')
  }
}
