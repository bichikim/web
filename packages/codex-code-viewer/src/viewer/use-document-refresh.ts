import {type Accessor, batch, createEffect, createSignal, on} from 'solid-js'
import {type CodeDocument, type CodeLocation, type ViewerSession} from '../shared/contracts'
import type {useLatestRequest} from './use-latest-request'
import {isMissingDocument} from './is-missing-document'

interface UseDocumentRefreshProps {
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
export const useDocumentRefresh = (props: UseDocumentRefreshProps) => {
  const [deleted, setDeleted] = createSignal(false)
  const [deferred, setDeferred] = createSignal(false)
  const reset = (): void =>
    batch(() => {
      setDeleted(false)
      setDeferred(false)
    })
  const read = async (location: CodeLocation): Promise<{document: CodeDocument | null}> => {
    try {
      return await props.read(location)
    } catch (error) {
      if (isMissingDocument(error)) {
        return {document: null}
      }
      throw error
    }
  }
  const refresh = async (): Promise<void> => {
    const current = props.session()
    if (current === null || props.navigation.pending() || props.saving()) {
      return
    }
    props.onRefresh?.()
    const result = await props.navigation.run(() => read(current.document.location))
    if (result === null) {
      return
    }
    if (result.document === null) {
      props.onDeleted(current)
    } else {
      props.onPresent({...current, document: result.document})
    }
    const dirty = props.dirty()
    setDeleted(result.document === null)
    setDeferred(result.document !== null && dirty)
    if (result.document !== null && !dirty) {
      props.onDocument(current, result.document)
    }
  }
  createEffect(
    on(
      [deferred, props.dirty, props.saving, props.navigation.pending],
      ([requested, dirty, saving, pending]) => {
        if (requested && !dirty && !saving && !pending) {
          setDeferred(false)
          refresh().catch(props.report)
        }
      },
    ),
  )
  return {deleted, refresh, reset}
}
