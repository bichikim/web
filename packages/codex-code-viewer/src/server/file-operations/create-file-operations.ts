import {readEntry} from './read-entry'
import {renameEntry} from './rename-entry'
import {removeEntry} from './remove-entry'
import {transferEntry} from './transfer-entry'
import type {RenameEntryProps, TransferEntryProps} from './types'

/** Binds file operations to the session's canonical workspace root. */
export const createFileOperations = (root: string) => ({
  read: (path: string) => readEntry({path, root}),
  remove: (path: string, revision: string) => removeEntry({path, revision, root}),
  rename: (props: Omit<RenameEntryProps, 'root'>) => renameEntry({...props, root}),
  transfer: (props: Omit<TransferEntryProps, 'root'>) => transferEntry({...props, root}),
})
