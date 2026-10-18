import type {WorkspaceEntry} from '../../shared/contracts'

export interface EntryPath extends WorkspaceEntry {
  readonly absolute: string
}
export interface EntryItem {
  readonly path: string
  readonly kind: WorkspaceEntry['kind']
  readonly mode: number
}
export interface EntrySnapshot extends EntryPath {
  readonly entries: readonly EntryItem[]
  readonly revision: string
}
export interface ReadEntryProps {
  readonly root: string
  readonly path: string
}
export interface RemoveEntryProps extends ReadEntryProps {
  readonly revision: string
}
export interface TransferEntryProps extends RemoveEntryProps {
  readonly action: 'copy' | 'cut'
  readonly parent: string
  readonly name?: string
}
export interface RenameEntryProps extends RemoveEntryProps {
  readonly name: string
}
