import type {ChangeKind} from '../../shared/change-contracts'
export interface FileTreeFolder {
  children: FileTreeNode[]
  kind: 'directory'
  name: string
  path: string
}
export interface FileTreeFile {
  change?: ChangeKind
  kind: 'file'
  name: string
  openable: boolean
  path: string
}
export type FileTreeNode = FileTreeFolder | FileTreeFile
