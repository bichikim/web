import type {Accessor} from 'solid-js'
import type {CodeLocation, WorkspaceEntry} from '../shared/contracts'
import type {useFileTree} from './use-file-tree'

interface TreeEntryOptions {
  readonly session: Accessor<string | undefined>
  readonly visible: Accessor<boolean>
  readonly tree: ReturnType<typeof useFileTree>
  readonly onFocus: (path: string) => void
  readonly onOpen: (location: CodeLocation) => void
}
/** Reveals a created entry only in its originating, still-visible tree. */
export const createTreeEntryHandler =
  (options: TreeEntryOptions) =>
  async (entry: WorkspaceEntry): Promise<void> => {
    const session = options.session()
    await options.tree.reload()
    if (session !== options.session() || !options.visible()) {
      return
    }
    options.tree.reveal(entry.path)
    options.onFocus(entry.path)
    const node = options.tree.node(entry.path)
    if (node?.kind === 'file' && node.openable) {
      options.onOpen({column: 1, line: 1, path: entry.path})
    }
  }
