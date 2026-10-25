import type {Accessor} from 'solid-js'
import type {FileMutation} from './types'
import type {useFileTree} from './use-file-tree'

interface TreeMutationOptions {
  readonly session: Accessor<string | undefined>
  readonly tree: Pick<ReturnType<typeof useFileTree>, 'reload' | 'reveal'>
  readonly onMutation?: (change: FileMutation) => Promise<void>
}

/** Refreshes a completed mutation only while its originating session remains connected. */
export const createTreeMutationHandler =
  (options: TreeMutationOptions) =>
  async (change: FileMutation): Promise<void> => {
    const session = options.session()
    await options.onMutation?.(change)
    if (options.session() !== session) {
      return
    }
    await options.tree.reload()
    if (options.session() === session && change.action !== 'delete') {
      options.tree.reveal(change.entry.path)
    }
  }
