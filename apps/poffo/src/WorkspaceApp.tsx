import {EditorLoading} from './editor/EditorLoading'
import {createSignal, ErrorBoundary, lazy, Show, Suspense, untrack} from 'solid-js'
import {EditorButton, EditorToast} from '@winter-love/puppet/editor'
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

const ModelWorkspace = (props: ModelWorkspaceProps) => {
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

const WorkspaceLoader = (props: EditorAppProps) => {
  const session = useDocumentSession({
    loadInitialDocument: () => props.loadInitialDocument(),
    get session() {
      return props.session
    },
  })
  return (
    <>
      <Suspense fallback={<EditorLoading mode={props.initialWorkspace} />}>
        <Show when={session.document()}>
          {(document) => <ModelWorkspace {...props} document={document()} recovery={session} />}
        </Show>
      </Suspense>
      <EditorToast
        message={
          session.failure() === null
            ? undefined
            : session.failure() === 'restore'
              ? '작업 복원 실패 · JSON으로 내보내세요'
              : '자동 저장 실패 · JSON으로 내보내세요'
        }
        onDismiss={session.dismissFailure}
      />
    </>
  )
}

export const WorkspaceApp = (props: EditorAppProps) => (
  <ErrorBoundary
    fallback={(_error, reset) => (
      <section class="document-load-error" role="alert">
        <p>문서를 불러오지 못했습니다.</p>
        <EditorButton onClick={reset}>다시 시도</EditorButton>
      </section>
    )}
  >
    <WorkspaceLoader {...props} />
  </ErrorBoundary>
)
