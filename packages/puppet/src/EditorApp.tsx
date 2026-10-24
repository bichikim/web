import {useWorkspace} from './workspace/context'
import type {DocumentSession} from './create-document-session'
import {ErrorBoundary, Show, Suspense} from 'solid-js'
import {PuppetEditor} from './editor'
import {EditorButton, EditorToast} from './design-system'
import {EditorStyles} from './editor/internal/EditorStyles'
import type {PuppetExampleDocument} from './editor/example-document'
import type {PuppetDocument} from './player'
import {type DocumentSessionFailure, useDocumentSession} from './use-document-session'

const FAILURE_MESSAGE: Readonly<Record<DocumentSessionFailure, string>> = {
  restore: '작업 복원 실패 · JSON으로 내보내세요',
  save: '자동 저장 실패 · JSON으로 내보내세요',
}

export interface EditorAppProps {
  /** Recovery session shared with another workspace. Omitted, restore the editor session. */
  readonly session?: DocumentSession
  readonly examples?: ReadonlyArray<PuppetExampleDocument>
  readonly initialMotionId?: string
  readonly initialWorkspace?: 'animation' | 'modeling'
  readonly loadInitialDocument: () => Promise<PuppetDocument>
}

const DocumentEditor = (props: EditorAppProps) => {
  const workspace = useWorkspace()
  const session = useDocumentSession({
    loadInitialDocument: () => props.loadInitialDocument(),
    get session() {
      return props.session
    },
  })
  return (
    <>
      <Suspense
        fallback={
          <section class="document-loading" aria-label="문서 준비 중" aria-busy="true">
            <div inert>
              <PuppetEditor initialWorkspace={props.initialWorkspace} />
            </div>
            <span role="status">문서 불러오는 중…</span>
          </section>
        }
      >
        <Show when={session.document()}>
          {(document) => (
            <PuppetEditor
              examples={props.examples}
              initialDocument={document()}
              replacementDocument={workspace?.replacement()}
              onDocumentChange={workspace?.publishDocument}
              initialMotionId={props.initialMotionId}
              initialWorkspace={props.initialWorkspace}
              onDocumentCommit={session.save}
              recovery={session}
            />
          )}
        </Show>
      </Suspense>
      <Show when={session.failure()}>
        {(failure) => (
          <EditorToast message={FAILURE_MESSAGE[failure()]} onDismiss={session.dismissFailure} />
        )}
      </Show>
    </>
  )
}

export const EditorApp = (props: EditorAppProps) => (
  <ErrorBoundary
    fallback={(_error, reset) => (
      <section class="editor-type-root document-load-error" role="alert">
        <EditorStyles />
        <p>문서를 불러오지 못했습니다.</p>
        <EditorButton onClick={reset}>다시 시도</EditorButton>
      </section>
    )}
  >
    <DocumentEditor {...props} />
  </ErrorBoundary>
)
