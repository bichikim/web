import {type Accessor, batch, createEffect, createSignal, on} from 'solid-js'
import {entrySchema, type ViewerConnection, type WorkspaceEntry} from '../shared/contracts'
import {callViewerTool} from './call-viewer-tool'
import {errorMessage} from './error-message'
import {useLatestRequest} from './use-latest-request'
import type {ViewerPort} from './types'

interface UseFileCreationProps {
  readonly onCreated: (entry: WorkspaceEntry) => Promise<void>
  readonly parent: Accessor<string>
  readonly port: ViewerPort
  readonly session: Accessor<ViewerConnection | null>
  readonly visible: Accessor<boolean>
}

export const useFileCreation = (props: UseFileCreationProps) => {
  const [context, setContext] = createSignal<{
    kind: WorkspaceEntry['kind']
    parent: string
    session: string
  } | null>(null)
  const [name, setName] = createSignal('')
  const [feedback, setFeedback] = createSignal('')
  const request = useLatestRequest((error) => setFeedback(errorMessage(error)))
  const cancel = (): void => {
    request.cancel()
    setContext(null)
  }
  createEffect(on([() => props.session()?.session, props.visible], cancel))
  const open = (kind: WorkspaceEntry['kind']): void => {
    const session = props.session()
    if (session === null || request.pending()) {
      return
    }
    batch(() => {
      setName('')
      setFeedback('')
      setContext({kind, parent: props.parent(), session: session.session})
    })
  }
  const submit = async (): Promise<void> => {
    const current = context()
    if (current === null || request.pending() || name().trim() === '') {
      return
    }
    setFeedback('')
    const result = await request.run(() =>
      callViewerTool({
        input: {...current, name: name()},
        name: 'code.create',
        port: props.port,
        schema: entrySchema,
      }),
    )
    if (result === null || context() !== current) {
      return
    }
    setContext(null)
    await props.onCreated(result)
  }
  return {
    cancel,
    change: (value: string) => {
      setName(value)
      setFeedback('')
    },
    context,
    feedback,
    name,
    open,
    pending: request.pending,
    submit,
  }
}
