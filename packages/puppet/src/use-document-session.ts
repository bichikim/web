import {type Accessor, createResource, createSignal, onCleanup, type Resource} from 'solid-js'
import {createDocumentSession, type DocumentSession} from './create-document-session'
import type {PuppetDocument} from './player'

interface UseDocumentSessionProps {
  readonly loadInitialDocument: () => Promise<PuppetDocument>
}

export type DocumentSessionFailure = 'restore' | 'save'

interface UseDocumentSessionResult {
  readonly document: Resource<PuppetDocument>
  readonly failure: Accessor<DocumentSessionFailure | null>
  readonly dismissFailure: () => void
  readonly save: (document: PuppetDocument) => Promise<void>
}

export const useDocumentSession = (props: UseDocumentSessionProps): UseDocumentSessionResult => {
  const [failure, setFailure] = createSignal<DocumentSessionFailure | null>(null)
  let failureReported = false
  let session: DocumentSession | null = null
  let disposed = false
  let writes = Promise.resolve()
  let revision = 0
  onCleanup(() => {
    disposed = true
  })
  const reportFailure = (error: unknown, kind: DocumentSessionFailure) => {
    console.warn('Puppet document recovery could not be saved or restored.', error)
    if (!disposed && !failureReported) {
      failureReported = true
      setFailure(kind)
    }
  }
  const [document] = createResource(async () => {
    try {
      session = createDocumentSession({
        database: globalThis.indexedDB,
        storage: globalThis.sessionStorage,
      })
      const restored = await session.read()
      if (restored !== null) {
        return restored
      }
    } catch (error) {
      reportFailure(error, 'restore')
    }
    return props.loadInitialDocument()
  })
  const save = async (nextDocument: PuppetDocument) => {
    const current = session
    if (current === null || disposed) {
      return
    }
    revision += 1
    const requested = revision
    // Skip superseded commits while a previous document is still being written.
    const completed = writes.then(() =>
      !disposed && requested === revision ? current.write(nextDocument) : undefined,
    )
    // Later commits must still be written after a failed transaction.
    writes = completed.catch(() => undefined)
    try {
      await completed
      if (!disposed && requested === revision) {
        failureReported = false
        setFailure(null)
      }
    } catch (error) {
      reportFailure(error, 'save')
    }
  }
  return {dismissFailure: () => setFailure(null), document, failure, save}
}
