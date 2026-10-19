import {type Accessor, createEffect, createSignal} from 'solid-js'
import type {ViewerSession} from '../shared/contracts'
import {createBoundedCache} from '../shared/create-bounded-cache'
import type {CodeSelection} from './types'
import {createLocalView} from './view-state/create-local-view'
import type {DraftStorage} from './drafts/types'
import type {FileViewBinding, FileViewState, ViewRequest} from './view-state/types'

interface SessionViewOptions {
  readonly storage?: DraftStorage
  readonly onError?: (error: unknown) => void
  readonly session: Accessor<ViewerSession | null>
  readonly selection: Accessor<CodeSelection | null>
}
const fileKey = (session: ViewerSession): string =>
  JSON.stringify([session.workspace, session.document.location.path])

/** Retains recent views and optionally restores session-scoped browser snapshots. */
export const useSessionViewState = (options: SessionViewOptions) => {
  const cache = createBoundedCache<FileViewState>({maxEntries: 64, maxWeight: 64, weight: () => 1})
  const persistence = options.storage === undefined ? undefined : createLocalView(options.storage)
  const read = (session: ViewerSession): FileViewState | undefined => {
    const key = fileKey(session)
    const cached = cache.get(key)
    if (cached !== undefined) {
      return cached
    }
    try {
      const restored = persistence?.read(session)
      if (restored !== undefined) {
        cache.set(key, restored)
      }
      return restored
    } catch (error) {
      options.onError?.(error)
      return undefined
    }
  }
  const update = (session: ViewerSession, patch: Partial<FileViewState>): void => {
    const next = {...read(session), ...patch}
    cache.set(fileKey(session), next)
    try {
      persistence?.write(session, next)
    } catch (error) {
      options.onError?.(error)
    }
  }
  const [request, setRequest] = createSignal<ViewRequest>({restore: true, version: 0})
  const bind = (): FileViewBinding | undefined => {
    const session = options.session()
    if (session === null) {
      return undefined
    }
    return {
      read: () => read(session),
      request,
      update: (patch) => update(session, patch),
    }
  }
  createEffect(() => {
    const session = options.session()
    const selection = options.selection()
    if (session !== null && selection?.path === session.document.location.path) {
      update(session, {selection})
    }
  })
  const restore = (session: ViewerSession, enabled: boolean): CodeSelection | undefined => {
    const saved = read(session)
    const selected = enabled ? saved?.selection : undefined
    if (!enabled) {
      update(session, {codeScroll: undefined})
    }
    setRequest((previous) => ({restore: enabled, version: previous.version + 1}))
    return selected
  }
  return {
    bind,
    fileKey: () => {
      const session = options.session()
      return session === null ? undefined : fileKey(session)
    },
    restore,
  }
}
