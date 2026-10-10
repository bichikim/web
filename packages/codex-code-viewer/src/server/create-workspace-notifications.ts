import {addAbortListener} from 'node:events'

interface WorkspaceRevision {
  revision: number
  readonly listeners: Set<(revision: number | null) => void>
}

interface WorkspaceNotifications {
  readonly changed: (session: string) => void
  readonly close: (session: string) => void
  readonly wait: (session: string, revision: number, signal: AbortSignal) => Promise<number>
  readonly watch: (session: string) => number
}

/** Retains workspace revisions and wakes pending requests on changes, cancellation or closure. */
export const createWorkspaceNotifications = (): WorkspaceNotifications => {
  const workspaces = new Map<string, WorkspaceRevision>()
  return {
    changed: (session: string): void => {
      const current = workspaces.get(session)
      if (current !== undefined) {
        current.revision += 1
        for (const receive of current.listeners) {
          receive(current.revision)
        }
      }
    },
    close: (session: string): void => {
      const current = workspaces.get(session)
      workspaces.delete(session)
      for (const receive of current?.listeners ?? []) {
        receive(null)
      }
    },
    wait: async (session: string, revision: number, signal: AbortSignal): Promise<number> => {
      signal.throwIfAborted()
      const current = workspaces.get(session)
      if (current === undefined) {
        throw new Error('Workspace session expired')
      }
      if (current.revision !== revision) {
        return current.revision
      }
      return new Promise((resolve, reject) => {
        const receive = (next: number | null): void => {
          current.listeners.delete(receive)
          cancellation[Symbol.dispose]()
          if (next === null) {
            reject(new Error('Workspace session expired'))
          } else {
            resolve(next)
          }
        }
        const cancellation = addAbortListener(signal, () => {
          current.listeners.delete(receive)
          reject(signal.reason)
        })
        current.listeners.add(receive)
      })
    },
    watch: (session: string): number => {
      let current = workspaces.get(session)
      if (current === undefined) {
        current = {listeners: new Set(), revision: 0}
        workspaces.set(session, current)
      }
      return current.revision
    },
  }
}
