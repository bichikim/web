import {
  type BrowserWorkspace,
  type BrowserWorkspaceOptions,
  createBrowserWorkspace,
} from './create-browser-workspace'
import {resolveWorkspace} from './resolve-workspace'

interface BrowserWorkspaces {
  readonly get: (requested?: string) => Promise<BrowserWorkspace | undefined>
  readonly close: () => Promise<void>
}

/** Retains an isolated viewer per verified workspace for the MCP process lifetime. */
export const createBrowserWorkspaces = (
  root: string,
  options: BrowserWorkspaceOptions,
): BrowserWorkspaces => {
  const entries = new Map<string, ReturnType<typeof createBrowserWorkspace>>()
  return {
    close: async (): Promise<void> => {
      await Promise.all([...entries.values()].map(async (entry) => (await entry).close()))
    },
    get: async (requested = root) => {
      const directory = await resolveWorkspace(root, requested)
      if (directory === undefined) {
        return undefined
      }
      let entry = entries.get(directory)
      if (entry === undefined) {
        entry = createBrowserWorkspace(directory, options).catch((error: unknown) => {
          entries.delete(directory)
          throw error
        })
        entries.set(directory, entry)
      }
      return entry
    },
  }
}
