import {type Accessor, batch, createEffect, createSignal, on} from 'solid-js'
import {type CodeDocument, type CodeLocation, type ViewerSession} from '../shared/contracts'
import type {useLatestRequest} from './use-latest-request'
import {isMissingDocument} from './is-missing-document'

interface DocumentRefreshOptions {
  readonly session: Accessor<ViewerSession | null>
  readonly dirty: Accessor<boolean>
  readonly saving: Accessor<boolean>
  readonly navigation: ReturnType<typeof useLatestRequest>
  readonly read: (location: CodeLocation) => Promise<{document: CodeDocument}>
  readonly onDocument: (session: ViewerSession, document: CodeDocument) => void
  readonly onDeleted: (session: ViewerSession) => void
  readonly onPresent: (session: ViewerSession) => void
  readonly report: (error: unknown) => void
  readonly onRefresh?: () => void
}

/** Checks deletion while retaining drafts and defers content replacement until editing is settled. */
export const useDocumentRefresh = (options: DocumentRefreshOptions) => {
  const [deleted, setDeleted] = createSignal(false)
  const [deferred, setDeferred] = createSignal(false)
  const reset = (): void =>
    batch(() => {
      setDeleted(false)
      setDeferred(false)
    })
  const read = async (location: CodeLocation): Promise<{document: CodeDocument | null}> => {
    try {
      return await options.read(location)
    } catch (error) {
      if (isMissingDocument(error)) {
        return {document: null}
      }
      throw error
    }
  }
  const refresh = async (): Promise<void> => {
    const current = options.session()
    if (current === null || options.navigation.pending() || options.saving()) {
      return
    }
    options.onRefresh?.()
    const result = await options.navigation.run(() => read(current.document.location))
    if (result === null) {
      return
    }
    if (result.document === null) {
      options.onDeleted(current)
    } else {
      options.onPresent({...current, document: result.document})
    }
    const dirty = options.dirty()
    setDeleted(result.document === null)
    setDeferred(result.document !== null && dirty)
    if (result.document !== null && !dirty) {
      options.onDocument(current, result.document)
    }
  }
  createEffect(
    on(
      [deferred, options.dirty, options.saving, options.navigation.pending],
      ([requested, dirty, saving, pending]) => {
        if (requested && !dirty && !saving && !pending) {
          setDeferred(false)
          refresh().catch(options.report)
        }
      },
    ),
  )
  return {deleted, refresh, reset}
}
