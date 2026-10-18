import type {WorkspaceTree} from '../../shared/contracts'
import {readDirectory} from '../read-directory'
import {fileFormat} from '../../shared/file-formats'
import {createWorkspaceLinks} from './create-workspace-links'

/** Discovers the complete code scope and creates its shared linking metadata. */
export const discoverLinkedWorkspace = async (
  root: string,
  sources: ReadonlyMap<string, string> = new Map(),
  discovered?: WorkspaceTree,
) => {
  const listing =
    discovered === undefined
      ? await readDirectory(root).then((listing) => ({
          directories: listing.directories.map((directory) => directory.path),
          files: [...listing.files],
          truncated: listing.truncated,
        }))
      : discovered
  if (listing.truncated) {
    throw new Error('Native linking requires complete workspace discovery')
  }
  const files = listing.files
    .filter((file) => fileFormat(file.path)?.kind === 'code')
    .map((file) => file.path)
  const workspace = createWorkspaceLinks({
    directories: listing.directories ?? [],
    files,
    root,
    sources,
  })
  return {files, workspace}
}
