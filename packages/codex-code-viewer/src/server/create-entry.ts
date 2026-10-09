import {closeSync, mkdirSync, openSync, realpathSync, statSync} from 'node:fs'
import {relative, resolve, sep} from 'node:path'
import {failure, type Result, success, type WorkspaceEntry} from '../shared/contracts'
import {isWithin} from './file-access'
import {isEntryName} from './is-entry-name'
import {isBrowsablePath} from './is-browsable-path'

interface CreateEntryProps {
  readonly kind: WorkspaceEntry['kind']
  readonly name: string
  readonly parent: string
  readonly root: string
}

const browsable = (root: string, path: string): boolean => {
  const parts = relative(root, path).split(sep)
  return (
    isWithin(root, path) &&
    parts.every((part) => !part.startsWith('.')) &&
    isBrowsablePath(parts.join('/'))
  )
}

/** Creates one empty workspace entry without overwriting an existing entry or creating parents. */
export const createEntry = (props: CreateEntryProps): Result<WorkspaceEntry> => {
  if (!isEntryName(props.name, props.kind)) {
    return failure('invalid-name')
  }
  const parent = resolve(props.root, props.parent)
  if (!browsable(props.root, parent)) {
    return failure('outside-workspace')
  }
  try {
    const root = realpathSync(props.root)
    const canonical = realpathSync(parent)
    if (!browsable(root, canonical)) {
      return failure('outside-workspace')
    }
    if (!statSync(canonical).isDirectory()) {
      return failure('create-failed')
    }
    const path = resolve(canonical, props.name)
    if (props.kind === 'directory') {
      mkdirSync(path)
    } else {
      closeSync(openSync(path, 'wx'))
    }
    return success({kind: props.kind, path: relative(root, path).split(sep).join('/')})
  } catch (error) {
    return failure(
      error instanceof Error && 'code' in error && error.code === 'EEXIST'
        ? 'already-exists'
        : 'create-failed',
    )
  }
}
