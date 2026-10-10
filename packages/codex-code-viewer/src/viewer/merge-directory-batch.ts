import type {ScanBatch, WorkspaceFile, WorkspaceTree} from '../shared/contracts'

export interface DirectoryContents {
  readonly directories: readonly string[]
  readonly files: readonly WorkspaceFile[]
}
interface DirectoryMerge {
  readonly initial: WorkspaceTree
  readonly previous: WorkspaceTree
  readonly batch: ScanBatch
  readonly contents: DirectoryContents
}
const parent = (path: string): string => path.split('/').slice(0, -1).join('/')

/** Replaces direct entries and removes cached descendants whose parent disappeared. */
export const mergeDirectoryBatch = (options: DirectoryMerge): WorkspaceTree => {
  const {batch, contents, initial, previous} = options
  if (batch.snapshot) {
    return {directories: batch.directories, files: batch.files, truncated: false}
  }
  const removed = batch.complete
    ? (initial.directories ?? []).filter(
        (path) => parent(path) === batch.directory && !contents.directories.includes(path),
      )
    : []
  const retained = (path: string): boolean =>
    parent(path) !== batch.directory &&
    !removed.some((directory) => path === directory || path.startsWith(`${directory}/`))
  return {
    directories: [...(previous.directories ?? []).filter(retained), ...contents.directories],
    files: [...previous.files.filter((file) => retained(file.path)), ...contents.files],
    truncated: false,
  }
}
