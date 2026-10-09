import {basename, dirname} from 'node:path'
import {failure, type Result, success, type WorkspaceEntry} from '../../shared/contracts'
import {isEntryName} from '../is-entry-name'
import {readEntry} from './read-entry'
import {transferEntry} from './transfer-entry'
import type {RenameEntryProps} from './types'

/** Changes an entry name in its current directory without overwriting another entry. */
export const renameEntry = async (props: RenameEntryProps): Promise<Result<WorkspaceEntry>> => {
  const source = await readEntry(props)
  if (!source.ok) {
    return source
  }
  if (!isEntryName(props.name, source.value.kind)) {
    return failure('invalid-name')
  }
  if (source.value.revision !== props.revision) {
    return failure('entry-changed')
  }
  if (basename(source.value.path) === props.name) {
    return success({kind: source.value.kind, path: source.value.path})
  }
  return transferEntry({...props, action: 'cut', parent: dirname(source.value.path)})
}
