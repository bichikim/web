import type {WorkspaceTree} from '../../shared/contracts'
import {discoverLinkedWorkspace} from './discover-linked-workspace'
import type {createWorkspaceLinks} from './create-workspace-links'

/** Shares discovery within one metadata epoch and discards results from invalidated epochs. */
export const createNativeDiscovery = (root: string, sources: () => ReadonlyMap<string, string>) => {
  let seeded: WorkspaceTree | undefined
  let pending: Promise<ReturnType<typeof createWorkspaceLinks>> | undefined
  let workspace: ReturnType<typeof createWorkspaceLinks> | undefined
  let scope: ReadonlySet<string> = new Set()
  let generation = 0
  return {
    clear: (): void => {
      seeded = undefined
      generation += 1
      pending = undefined
      workspace = undefined
      scope = new Set()
    },
    read: (): Promise<ReturnType<typeof createWorkspaceLinks>> => {
      const current = generation
      pending ??= discoverLinkedWorkspace(root, sources(), seeded).then(
        ({files, workspace: discovered}) => {
          if (current !== generation) {
            throw new Error('Native workspace discovery invalidated')
          }
          workspace = discovered
          scope = new Set(files)
          return workspace
        },
      )
      return pending
    },
    scope: (): ReadonlySet<string> => scope,
    seed: (listing: WorkspaceTree): void => {
      if (pending === undefined) {
        seeded = listing
      }
    },
    statistics: () => workspace?.statistics(),
  }
}
