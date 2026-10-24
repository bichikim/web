import {Show} from 'solid-js'
import {EditorButton} from './design-system/EditorButton'
interface WorkspaceNavigationProps {
  readonly current: 'editor' | 'studio' | 'viewer'
  readonly search?: string
  readonly onStudioOpen?: () => void
  readonly onViewerOpen?: () => void
}
export const WorkspaceNavigation = (props: WorkspaceNavigationProps) => (
  <nav class="workspace-navigation" aria-label="작업 공간 이동">
    <a
      class="editor-control editor-button"
      data-control-size="md"
      href="/editor"
      aria-current={props.current === 'editor' ? 'page' : undefined}
      data-selected={props.current === 'editor' ? '' : undefined}
    >
      Editor
    </a>
    <Show
      when={props.current === 'editor'}
      fallback={
        <>
          <a
            class="editor-control editor-button"
            data-control-size="md"
            href={`/studio${props.search ?? ''}`}
            aria-current={props.current === 'studio' ? 'page' : undefined}
            data-selected={props.current === 'studio' ? '' : undefined}
          >
            Studio
          </a>
          <a
            class="editor-control editor-button"
            data-control-size="md"
            href={`/viewer${props.search ?? ''}`}
            aria-current={props.current === 'viewer' ? 'page' : undefined}
            data-selected={props.current === 'viewer' ? '' : undefined}
          >
            Viewer
          </a>
        </>
      }
    >
      <EditorButton
        size="md"
        disabled={props.onStudioOpen === undefined}
        onClick={props.onStudioOpen}
      >
        Studio
      </EditorButton>
      <EditorButton
        size="md"
        disabled={props.onViewerOpen === undefined}
        onClick={props.onViewerOpen}
      >
        Viewer
      </EditorButton>
    </Show>
  </nav>
)
