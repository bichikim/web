import {Show} from 'solid-js'
import type {PuppetDocument} from '../../player'
import type {ParameterEditorResult} from '../use-parameter-editor'
import {EditorModelingKeyformPanel} from './EditorModelingKeyformPanel'
import {EditorTimeline} from './EditorTimeline'

interface EditorWorkspacePanelProps {
  /** Blocks old target edits while a layer or workspace change is prepared; omitted for normal editing. */
  readonly selectionPending?: boolean
  readonly currentTime: number
  readonly document: PuppetDocument
  readonly editor: ParameterEditorResult
  readonly isPlaying: boolean
  readonly motionId: string | null
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onMotionChange?: (motionId: string) => void
  readonly onMotionSeek?: (motionId: string, time: number) => void
  readonly onPlaybackToggle?: () => void
  readonly onSeek?: (time: number) => void
  readonly selectedNodeIds: ReadonlyArray<string>
  readonly setBrushControlsMount?: (element: HTMLDivElement | undefined) => void
  readonly workspace: 'animation' | 'modeling'
}
export const EditorWorkspacePanel = (props: EditorWorkspacePanelProps) => (
  <Show
    when={props.workspace === 'modeling'}
    fallback={
      <EditorTimeline
        selectionPending={props.selectionPending}
        currentTime={props.currentTime}
        document={props.document}
        isPlaying={props.isPlaying}
        motionId={props.motionId ?? undefined}
        onDocumentChange={props.onDocumentChange}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        onMotionChange={props.onMotionChange}
        onMotionSeek={props.onMotionSeek}
        onPlaybackToggle={props.onPlaybackToggle}
        onSeek={props.onSeek}
        parameterValues={props.editor.parameterValueMap()}
      />
    }
  >
    <section
      class="modeling-panel"
      aria-label="Parameter와 키폼 편집"
      inert={props.selectionPending}
      aria-busy={props.selectionPending || undefined}
    >
      <EditorModelingKeyformPanel
        document={props.document}
        editor={props.editor}
        onEditEnd={props.onEditEnd}
        onEditStart={props.onEditStart}
        selectedNodeIds={props.selectedNodeIds}
        setBrushControlsMount={props.setBrushControlsMount}
      />
    </section>
  </Show>
)
