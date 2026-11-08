import {createResource, ErrorBoundary, onCleanup, Show, Suspense} from 'solid-js'
import {EditorToast} from '@winter-love/puppet/editor'
import {WorkspaceApp} from '../../WorkspaceApp'
import {connectModelHost} from './connect-model-host'
import {createRemoteModelSession} from './create-remote-model-session'
import {renderDocument} from './render-document'
import {hashValue} from '../hash-value'
import type {PuppetDocument} from '@winter-love/puppet/player'
import type {ModelEvent} from '../model-events'

export interface ConnectedWorkspaceProps {
  readonly url: string
  readonly token: string
}

const ERROR_MESSAGE_LENGTH = 160

export const ConnectedWorkspace = (props: ConnectedWorkspaceProps) => {
  const controller = new AbortController()
  let remote: ReturnType<typeof createRemoteModelSession> | undefined
  let transport: Awaited<ReturnType<typeof connectModelHost>> | undefined
  let disposed = false
  let disconnection: string | undefined
  const events: ModelEvent[] = []
  const [connected] = createResource(async () => {
    transport = await connectModelHost({
      onDisconnect: (message) => {
        disconnection = message
        remote?.disconnect(message)
      },
      onEvent: (event) => {
        if (remote === undefined) {
          events.push(event)
        } else {
          remote.receive(event)
        }
      },
      onRender: async (request) => {
        if (remote === undefined || remote.binding.revision() !== request.input.expectedRevision) {
          throw new Error('Render snapshot is stale')
        }
        return renderDocument({...request.input, document: remote.binding.document()})
      },
      signal: controller.signal,
      token: props.token,
      url: props.url,
    })
    if (disposed) {
      transport.close()
    }
    return transport
  })
  onCleanup(() => {
    disposed = true
    controller.abort()
    remote?.dispose()
    transport?.close()
  })
  return (
    <ErrorBoundary
      fallback={(error) => (
        <p role="alert">
          모델 연결 실패: {String(error).split('\n')[0]?.slice(0, ERROR_MESSAGE_LENGTH)}
        </p>
      )}
    >
      <Suspense fallback={<p role="status">모델 연결 중…</p>}>
        <Show when={connected()}>
          {(connection) => {
            const host = connection()
            remote = createRemoteModelSession({
              initial: host.initial,
              send: host.send,
            })
            // The initial snapshot has already been applied; later queued deltas follow it.
            for (const event of events.splice(1)) {
              remote.receive(event)
            }
            events.length = 0
            if (disconnection !== undefined) {
              remote.disconnect(disconnection)
            }
            const model = remote
            const initial = host.initial.document
            const loadInitialDocument = async () => initial
            const handleDocumentSaved = async (document: PuppetDocument) => {
              const view = model.binding.read()
              if (view.document !== document || view.transaction !== null) {
                return
              }
              const fingerprint = await hashValue(document)
              await host.send('document.saved', {expectedRevision: view.revision, fingerprint})
            }
            return (
              <>
                <WorkspaceApp
                  model={model.binding}
                  onDocumentSaved={handleDocumentSaved}
                  loadInitialDocument={loadInitialDocument}
                  session={{
                    listRecoveries: async () => [],
                    loadRecovery: async () => null,
                    read: loadInitialDocument,
                    write: async () => undefined,
                  }}
                />
                <EditorToast
                  tone="error"
                  message={model.failure() ?? undefined}
                  onDismiss={model.dismissFailure}
                />
              </>
            )
          }}
        </Show>
      </Suspense>
    </ErrorBoundary>
  )
}
