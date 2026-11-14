import {createSignal, lazy, Show, Suspense, untrack} from 'solid-js'
import {EditorToast} from '@winter-love/puppet/editor'
import type {EditorAppProps} from './EditorApp'
import {useWorkspaceLocation} from './use-workspace-location'
import {WorkspaceProvider} from './workspace/WorkspaceProvider'
import {WorkspacePages} from './workspace/WorkspacePages'
import type {WorkspaceMode} from './workspace/types'
import {useDocumentSession} from './use-document-session'
import {createModelSession} from './model/create-model-session'
import type {PuppetDocument} from '@winter-love/puppet/player'

const ConverterPage = lazy(() =>
  import('./converter/ConverterPage').then((module) => ({default: module.ConverterPage})),
)

interface ModelWorkspaceProps extends EditorAppProps {
  readonly document: PuppetDocument
  readonly recovery: ReturnType<typeof useDocumentSession>
}

export const ModelWorkspace = (props: ModelWorkspaceProps) => {
  const model = createModelSession({
    document: untrack(() => props.document),
    onCommit: (document) => {
      props.recovery.save(document)
    },
    sessionId: crypto.randomUUID(),
  })
  const [navigationError, setNavigationError] = createSignal<string | null>(null)
  if (location.pathname === '/') {
    history.replaceState(history.state, '', `/editor${location.search}${location.hash}`)
  }
  const current = useWorkspaceLocation(() => {
    if (model.read().transaction === null) {
      return true
    }
    setNavigationError('진행 중인 편집을 마친 후 이동하세요.')
    return false
  })
  const converter = () => /^\/converter\/?$/u.test(current().pathname)
  const mode = (): WorkspaceMode => {
    switch (current().pathname.replace(/\/$/u, '')) {
      case '/viewer':
        return 'viewer'
      case '/studio':
        return 'studio'
      default:
        return 'editor'
    }
  }
  return (
    <>
      <div class="workspace-page" hidden={converter()} inert={converter()}>
        <WorkspaceProvider model={model} mode={mode()} active={!converter()}>
          <WorkspacePages {...props} model={model} recovery={props.recovery} />
        </WorkspaceProvider>
      </div>
      <EditorToast
        tone="error"
        message={navigationError() ?? undefined}
        onDismiss={() => setNavigationError(null)}
      />
      <Show when={converter()}>
        <Suspense>
          <ConverterPage />
        </Suspense>
      </Show>
    </>
  )
}
