import {type Accessor, createEffect, createSignal} from 'solid-js'
import type {ViewerSession} from '../shared/contracts'
import {createBoundedCache} from '../shared/create-bounded-cache'
import type {CodeSelection} from './types'
import type {FileViewBinding, FileViewState, ViewRequest} from './view-state/types'

interface SessionViewOptions {
  readonly session: Accessor<ViewerSession | null>
  readonly selection: Accessor<CodeSelection | null>
}
const fileKey = (session: ViewerSession): string =>
  JSON.stringify([session.workspace, session.document.location.path])

/** Remembers recent file views in memory for the lifetime of this viewer. */
export const useSessionViewState = (options: SessionViewOptions) => {
  const cache = createBoundedCache<FileViewState>({maxEntries: 64, maxWeight: 64, weight: () => 1})
  const [request, setRequest] = createSignal<ViewRequest>({restore: true, version: 0})
  const bind = (): FileViewBinding | undefined => {
    const session = options.session()
    if (session === null) {
      return undefined
    }
    const key = fileKey(session)
    return {
      read: () => cache.get(key),
      request,
      update: (patch) => cache.set(key, {...cache.get(key), ...patch}),
    }
  }
  createEffect(() => {
    const session = options.session()
    const selection = options.selection()
    if (session !== null && selection?.path === session.document.location.path) {
      const key = fileKey(session)
      cache.set(key, {...cache.get(key), selection})
    }
  })
  const restore = (session: ViewerSession, enabled: boolean): CodeSelection | undefined => {
    const key = fileKey(session)
    const saved = cache.get(key)
    const selected = enabled ? saved?.selection : undefined
    if (!enabled) {
      cache.set(key, {...saved, codeScroll: undefined})
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
