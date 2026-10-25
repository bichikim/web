import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'
import type {CodeLocation, ViewerConnection, ViewerSession} from '../shared/contracts'
import {isEditableFile} from '../shared/is-editable-file'
import type {useCodeEditing} from './use-code-editing'
import type {DeletedDocument, NavigationOptions, ViewerPort} from './types'
import {useLatestRequest} from './use-latest-request'

interface DeletedDocumentOptions {
  /** Shares the viewer's draft storage and save queue; omitted views remain read-only. */
  readonly editing?: ReturnType<typeof useCodeEditing>
  readonly port: ViewerPort
  readonly session: Accessor<ViewerConnection | null>
  readonly documentPath: Accessor<string | undefined>
  readonly revision: Accessor<number>
  readonly onError: (error: unknown) => void
  readonly onOpen: (location: CodeLocation, options?: NavigationOptions) => void
  readonly onMove: (direction: -1 | 1) => void | Promise<void>
  readonly onRefresh: () => void | Promise<void>
}

/** Retains a deleted baseline and a separate draft without replacing the live document. */
export const useDeletedDocument = (options: DeletedDocumentOptions) => {
  const [document, setDocument] = createSignal<DeletedDocument | null>(null)
  const [enabled, setEnabled] = createSignal(false)
  let generation = 0
  const draftSession = createMemo<ViewerSession | null>(() => {
    const current = document()
    const session = options.session()
    return current === null ||
      current.source === null ||
      session === null ||
      options.editing === undefined ||
      !isEditableFile(current.path)
      ? null
      : {
          document: {
            lines: [[]],
            location: {column: 1, line: 1, path: current.path},
            revision: '',
            source: '',
          },
          session: session.session,
          workspace: session.workspace,
        }
  })
  const request = useLatestRequest((error) => {
    setDocument(null)
    setEnabled(false)
    options.onError(error)
  })
  const close = (): void => {
    generation += 1
    request.cancel()
    setDocument(null)
    setEnabled(false)
  }
  onCleanup(close)
  const scope = createMemo(() => {
    const session = options.session()
    return session === null ? '' : JSON.stringify([session.session, session.workspace])
  })
  const documentPath = createMemo(options.documentPath)
  createEffect(on([scope, documentPath], close))
  const openLocation = (location: CodeLocation, navigation?: NavigationOptions): void => {
    close()
    options.onOpen(location, navigation)
  }
  const save = async (): Promise<void> => {
    const current = draftSession()
    const version = generation
    if (
      current !== null &&
      enabled() &&
      (await options.editing?.saveDeleted(current)) &&
      version === generation
    ) {
      openLocation(current.document.location)
    }
  }
  const load = async (path: string): Promise<void> => {
    const session = options.session()
    const read = options.port.readBaseline
    if (session === null || read === undefined) {
      close()
      return
    }
    const result = await request.run(() => read(session.session, path))
    if (result !== null) {
      setDocument({base: result.base, path, source: result.source})
    }
  }
  const refresh = async (): Promise<void> => {
    const current = document()
    if (current === null) {
      await options.onRefresh()
    } else {
      await load(current.path)
    }
  }
  createEffect(
    on(options.revision, () => {
      const current = document()
      if (current !== null) {
        load(current.path)
      }
    }),
  )
  return {
    change: (source: string): void => {
      const current = draftSession()
      if (current !== null && enabled()) {
        options.editing?.changeDeleted(current, source)
      }
    },
    close,
    document,
    editable: () => draftSession() !== null,
    enabled,
    move: async (direction: -1 | 1): Promise<void> => {
      if (document() === null) {
        await options.onMove(direction)
      } else if (direction === -1) {
        close()
      }
    },
    open: async (path: string): Promise<void> => {
      setEnabled(false)
      generation += 1
      const version = generation
      setDocument({base: null, path, source: null})
      await load(path)
      const current = draftSession()
      if (version === generation && current !== null) {
        options.editing?.restoreDrafts(current)
      }
    },
    openLocation,
    pending: request.pending,
    refresh,
    save,
    saving: () => options.editing?.saving() ?? false,
    source: (): string => {
      const current = draftSession()
      return current === null ? '' : (options.editing?.sourceFor(current) ?? '')
    },
    toggleEditing: (): void => {
      if (draftSession() !== null && !options.editing?.saving()) {
        setEnabled((previous) => !previous)
      }
    },
  }
}
