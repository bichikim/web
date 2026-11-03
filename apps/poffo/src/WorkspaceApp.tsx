import {ErrorBoundary} from 'solid-js'
import {EditorButton} from '@winter-love/puppet/editor'
import type {EditorAppProps} from './EditorApp'
import {WorkspaceLoader} from './WorkspaceLoader'

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
