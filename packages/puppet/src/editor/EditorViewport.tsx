import type {DeformerEditMode} from './internal/DeformerMode'
import {createSignal, type JSX, Show} from 'solid-js'
import {Portal} from 'solid-js/web'

import type {PuppetParameterValueMap, PuppetParameterValues} from '../deformation'
import type {Player, PlayerFrame, PuppetDocument} from '../player'
import {DeformerEditor} from './internal/DeformerEditor'
import type {DeformerControlSelection} from './internal/deformer-control-selection'
import {MeshEditor} from './MeshEditor'
import {PlayerCanvas, type PlayerCanvasStatus} from './PlayerCanvas'

export interface EditorViewportProps {
  readonly deformerMode?: DeformerEditMode
  readonly onDeformerModeChange?: (mode: DeformerEditMode) => void
  readonly renderDeformerControls?: (controls: JSX.Element) => JSX.Element
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activePartId?: string
  readonly activeNodeId?: string
  readonly activeVertexIndex?: number | null
  readonly currentTime?: number
  readonly deformerControlSelection: DeformerControlSelection
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDeformerEditEnd?: () => void
  readonly onDeformerEditStart?: () => void
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
  readonly onPlayerChange?: (player: Player | null) => void
  readonly onStatusChange?: (status: PlayerCanvasStatus) => void
  readonly onTimeChange?: (time: number) => void
  readonly onVertexEditStart?: () => void
  readonly onVertexSelect?: (vertexIndex: number | null) => void
  readonly parameterValues?: PuppetParameterValues
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly previewDocument?: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetNodeIds?: ReadonlyArray<string>
}

export const EditorViewport = (props: EditorViewportProps) => {
  const [displayMount, setDisplayMount] = createSignal<HTMLDivElement>()
  return (
    <section
      aria-label={
        props.editMode === 'parameter'
          ? 'Parameter 정점 형태 편집'
          : '저장 데이터 플레이어 미리보기'
      }
      class="viewport-panel"
    >
      <div class="viewport">
        <PlayerCanvas
          document={props.document}
          onFrame={(frame: PlayerFrame) => props.onTimeChange?.(frame.time)}
          onPlayerChange={props.onPlayerChange}
          onStatusChange={props.onStatusChange}
          parameterValues={props.parameterValueMap}
        />
        <MeshEditor
          renderDisplayControls={(controls) => (
            <Show when={displayMount()}>
              {(mount) => <Portal mount={mount()}>{controls}</Portal>}
            </Show>
          )}
          activeBindingId={props.activeBindingId}
          activeKeyformValues={props.activeKeyformValues}
          activePartId={props.activePartId}
          document={props.document}
          editMode={props.editMode}
          onDocumentChange={props.onDocumentChange}
          onNotice={props.onNotice}
          onVertexEditStart={props.onVertexEditStart}
          onVertexSelect={props.onVertexSelect}
          previewTime={props.currentTime}
          parameterValues={props.parameterValues}
          parameterValueMap={props.parameterValueMap}
          selectedPartIds={props.selectedPartIds}
          selectedVertexIndex={props.activeVertexIndex}
        />
        <DeformerEditor
          deformerMode={props.deformerMode}
          onDeformerModeChange={props.onDeformerModeChange}
          renderControls={props.renderDeformerControls}
          activeBindingId={props.activeBindingId}
          activeKeyformValues={props.activeKeyformValues}
          activeNodeId={props.activeNodeId}
          controlSelection={props.deformerControlSelection}
          document={props.document}
          editMode={props.editMode}
          onDocumentChange={props.onDocumentChange}
          onEditEnd={props.onDeformerEditEnd}
          onEditStart={props.onDeformerEditStart}
          previewDocument={props.previewDocument}
          targetNodeIds={props.targetNodeIds}
        />
        <div class="viewport-display" ref={setDisplayMount} />
      </div>
    </section>
  )
}
