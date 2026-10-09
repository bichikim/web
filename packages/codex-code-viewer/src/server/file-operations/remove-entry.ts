import {rm} from 'node:fs/promises'
import {failure, type Result, success, type WorkspaceEntry} from '../../shared/contracts'
import {readEntry} from './read-entry'
import type {RemoveEntryProps} from './types'

/** Removes an existing workspace entry only when its full metadata snapshot still matches. */
export const removeEntry = async (props: RemoveEntryProps): Promise<Result<WorkspaceEntry>> => {
  const current = await readEntry(props)
  if (!current.ok) {
    return current
  }
  if (current.value.revision !== props.revision) {
    return failure('entry-changed')
  }
  try {
    await rm(current.value.absolute, {recursive: current.value.kind === 'directory'})
    return success({kind: current.value.kind, path: current.value.path})
  } catch {
    return failure('file-operation-failed')
  }
}
