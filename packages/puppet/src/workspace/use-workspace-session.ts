import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  untrack,
} from 'solid-js'
import {createDocumentSession, type DocumentSession} from '../create-document-session'
import {createRuntimeDocumentSession} from '../runtime/create-runtime-document-session'
import {navigateWorkspace} from '../navigate-workspace'
import type {PuppetDocument} from '../player'
interface WorkspaceSessionOptions {
  /** Browser location, including externally selected document sessions. */
  readonly location: Accessor<URL>
  /** Existing standalone recovery session. Omitted, use editor recovery storage. */
  readonly fallback: Accessor<DocumentSession | undefined>
}
export const useWorkspaceSession = (options: WorkspaceSessionOptions) => {
  const routeId = createMemo(() => options.location().searchParams.get('session'))
  const [sessionId, setSessionId] = createSignal(untrack(routeId))
  const [scope, setScope] = createSignal(untrack(routeId) ?? 'default')
  const session = createMemo(() => {
    const id = sessionId()
    return id === null
      ? (options.fallback() ??
          createDocumentSession({
            database: globalThis.indexedDB,
            storage: globalThis.sessionStorage,
          }))
      : createRuntimeDocumentSession(id)
  })
  let writes = Promise.resolve()
  const persist = (target: DocumentSession, document: PuppetDocument) => {
    const completed = writes.then(() => target.write(document))
    writes = completed.catch(() => undefined)
    return completed
  }
  let persisted: PuppetDocument | null = null
  let persistedId: string | null | undefined
  const write = async (document: PuppetDocument) => {
    const target = session()
    const id = sessionId()
    await persist(target, document)
    if (target === session()) {
      persisted = document
      persistedId = id
    }
  }
  const recovery: DocumentSession = {
    listRecoveries: () => session().listRecoveries(),
    loadRecovery: (id) => session().loadRecovery(id),
    read: async () => {
      const target = session()
      const id = sessionId()
      const document = await target.read()
      if (target === session()) {
        persisted = document
        persistedId = id
      }
      return document
    },
    write,
  }
  let revision = 0
  onCleanup(() => {
    revision += 1
  })
  createEffect(
    on(
      routeId,
      (id) => {
        if (id !== untrack(sessionId)) {
          revision += 1
          batch(() => {
            setSessionId(id)
            setScope(id ?? 'default')
          })
        }
      },
      {defer: true},
    ),
  )
  const openRuntime = async (
    page: 'studio' | 'viewer',
    document: PuppetDocument,
    motionId?: string,
    signal?: AbortSignal,
  ) => {
    revision += 1
    const request = revision
    const id = sessionId() ?? crypto.randomUUID()
    if (persisted !== document || persistedId !== id) {
      await persist(createRuntimeDocumentSession(id), document)
    }
    if (request !== revision || signal?.aborted) {
      return
    }
    setSessionId(id)
    persisted = document
    persistedId = id
    const url = new URL(`/${page}`, location.origin)
    url.searchParams.set('session', id)
    if (motionId !== undefined) {
      url.searchParams.set('motion', motionId)
    }
    navigateWorkspace(url.href)
  }
  return {openRuntime, recovery, scope}
}
