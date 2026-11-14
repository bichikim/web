import {createMemo, lazy, Show} from 'solid-js'
import {type DocumentEditorProps, EditorApp} from '../EditorApp'
import {useWorkspace} from './context'
const RuntimePage = lazy(() =>
  import('../runtime/RuntimePage').then((module) => ({default: module.RuntimePage})),
)
export const WorkspacePages = (props: DocumentEditorProps) => {
  const workspace = useWorkspace()!
  const runtime = createMemo((previous) => previous || workspace.mode() !== 'editor', false)
  return (
    <>
      <div
        class="workspace-page"
        hidden={workspace.mode() !== 'editor'}
        inert={workspace.mode() !== 'editor'}
      >
        <EditorApp {...props} />
      </div>
      <Show when={runtime()}>
        <div
          class="workspace-page"
          hidden={workspace.mode() === 'editor'}
          inert={workspace.mode() === 'editor'}
        >
          <RuntimePage mode={workspace.mode() === 'studio' ? 'studio' : 'viewer'} />
        </div>
      </Show>
    </>
  )
}
