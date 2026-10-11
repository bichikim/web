import {addAbortListener} from 'node:events'

const MAX_WAIT_MS = 20_000

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

/** Retains revisions and finishes waits on changes, cancellation, closure or an idle deadline. */
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
      // The app bridge may not forward client cancellation; finish before its 30-second deadline.
      const deadline = AbortSignal.timeout(MAX_WAIT_MS)
      const waiting = AbortSignal.any([signal, deadline])
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
        const cancellation = addAbortListener(waiting, () => {
          current.listeners.delete(receive)
          cancellation[Symbol.dispose]()
          if (signal.aborted) {
            reject(signal.reason)
          } else {
            resolve(current.revision)
          }
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
