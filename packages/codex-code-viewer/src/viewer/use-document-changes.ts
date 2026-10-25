import {type Accessor, createEffect, createMemo, createSignal, on} from 'solid-js'
import type {FileBaseline} from '../shared/change-contracts'
import type {ViewerSession} from '../shared/contracts'
import {MAX_CODE_BYTES} from '../shared/editing-limits'
import {createLineChanges} from './create-line-changes'
import {useLatestRequest} from './use-latest-request'
import type {ViewerPort} from './types'

interface DocumentChangesProps {
  readonly port: ViewerPort
  readonly session: Accessor<ViewerSession | null>
  readonly source: Accessor<string>
  readonly revision: Accessor<number>
  readonly onError: (error: unknown) => void
}
export const useDocumentChanges = (props: DocumentChangesProps) => {
  const [baseline, setBaseline] = createSignal<FileBaseline | null>(null)
  const request = useLatestRequest((error) => {
    setBaseline(null)
    props.onError(error)
  })
  const originalSource = createMemo(() => baseline()?.source)
  const key = createMemo(() => {
    const session = props.session()
    return session === null ? '' : `${session.session}:${session.document.location.path}`
  })
  createEffect(
    on([key, props.revision], async ([currentKey], previous) => {
      request.cancel()
      if (currentKey !== previous?.[0]) {
        setBaseline(null)
      }
      const current = props.session()
      if (
        current === null ||
        props.port.readBaseline === undefined ||
        (current.document.media !== undefined &&
          current.document.media.mimeType !== 'image/svg+xml') ||
        current.document.readOnly === true
      ) {
        setBaseline(null)
        return
      }
      const read = props.port.readBaseline
      const result = await request.run(() => read(current.session, current.document.location.path))
      if (result !== null) {
        setBaseline(result)
      }
    }),
  )
  const hunks = createMemo(() => {
    const original = originalSource()
    const source = props.source()
    return original === null || original === undefined || source.length > MAX_CODE_BYTES
      ? []
      : createLineChanges(original, source)
  })
  return {base: () => baseline()?.base ?? null, hunks}
}
