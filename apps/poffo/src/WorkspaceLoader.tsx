import {EditorLoading} from './editor/EditorLoading'
import {Show, Suspense} from 'solid-js'
import {EditorToast} from '@winter-love/puppet/editor'
import type {EditorAppProps} from './EditorApp'
import {useDocumentSession} from './use-document-session'
import {ModelWorkspace} from './ModelWorkspace'

export const WorkspaceLoader = (props: EditorAppProps) => {
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
        tone="error"
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
