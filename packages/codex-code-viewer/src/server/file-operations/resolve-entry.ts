import {lstat, realpath} from 'node:fs/promises'
import {relative, resolve, sep} from 'node:path'
import {failure, type Result, success} from '../../shared/contracts'
import {isWithin} from '../file-access'
import {isBrowsablePath} from '../is-browsable-path'
import type {EntryPath, ReadEntryProps} from './types'

interface ResolveEntryProps extends ReadEntryProps {
  readonly allowRoot?: boolean
}

/** Resolves a regular browsable entry without following symbolic links or escaping the workspace. */
export const resolveEntry = async (props: ResolveEntryProps): Promise<Result<EntryPath>> => {
  const absolute = resolve(props.root, props.path)
  const path = relative(props.root, absolute).split(sep).join('/')
  if (
    !isWithin(props.root, absolute) ||
    (path === '' && !props.allowRoot) ||
    !isBrowsablePath(path)
  ) {
    return failure('outside-workspace')
  }
  try {
    const canonical = await realpath(absolute)
    if (!isWithin(props.root, canonical)) {
      return failure('outside-workspace')
    }
    if (canonical !== absolute) {
      return failure('protected-entry')
    }
    const stats = await lstat(absolute)
    if (stats.isSymbolicLink() || (!stats.isDirectory() && !stats.isFile())) {
      return failure('protected-entry')
    }
    if (stats.isDirectory() && path.split('/').some((part) => part.startsWith('.'))) {
      return failure('outside-workspace')
    }
    return success({absolute, kind: stats.isDirectory() ? 'directory' : 'file', path})
  } catch (error) {
    return failure(
      error instanceof Error && 'code' in error && error.code === 'ENOENT'
        ? 'not-found'
        : 'file-operation-failed',
    )
  }
}
