import {getSceneNode} from '../internal/scene-graph'
import {SkinningTools} from '../internal/SkinningTools'
import {type JSX, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import type {PuppetDocument} from '../../player'
import {DeformerEditor} from '../internal/DeformerEditor'
import {MeshEditor} from '../MeshEditor'
import type {EditorViewportProps} from './types'

interface EditorViewportOverlaysProps {
  readonly displayMount?: HTMLDivElement
  readonly document: PuppetDocument
  readonly editingMesh: boolean
  readonly meshControls: JSX.Element
  readonly onMeshNotice: (message: string | null) => void
  readonly viewport: EditorViewportProps
  readonly visible: boolean
}

export const EditorViewportOverlays = (props: EditorViewportOverlaysProps) => {
  const editingDeformer = () =>
    getSceneNode(props.document, props.viewport.activeNodeId ?? '')?.kind === 'deformer'
  const meshBrushMount = () =>
    props.visible && !editingDeformer() ? props.viewport.brushControlsMount : undefined
  const renderControls = (controls: JSX.Element) => (
    <Show when={props.visible}>{props.viewport.renderEditingControls?.(controls) ?? controls}</Show>
  )

  return (
    <div
      class="editing-overlays"
      data-hidden={!props.visible}
      inert={!props.visible}
      aria-hidden={!props.visible}
    >
      <MeshEditor
        brushControlsMount={meshBrushMount()}
        brushSettingsMount={props.viewport.brushSettingsMount}
        brushControlsExternal
        meshEditing={props.editingMesh}
        modeControls={
          props.viewport.editMode === 'parameter' && props.viewport.activePartId !== undefined
            ? props.meshControls
            : undefined
        }
        renderDisplayControls={(controls) => (
          <Show when={props.visible}>
            <Show when={props.displayMount}>
              {(mount) => <Portal mount={mount()}>{controls}</Portal>}
            </Show>
          </Show>
        )}
        activeBindingId={props.viewport.activeBindingId}
        activeKeyformValues={props.viewport.activeKeyformValues}
        activePartId={props.viewport.activePartId}
        document={props.document}
        editMode={props.viewport.editMode}
        onDocumentChange={
          props.editingMesh ? props.viewport.onRestDocumentChange : props.viewport.onDocumentChange
        }
        onNotice={props.editingMesh ? props.onMeshNotice : props.viewport.onNotice}
        onVertexEditStart={props.viewport.onVertexEditStart}
        onVertexSelect={props.viewport.onVertexSelect}
        motionId={props.viewport.motionId}
        previewTime={props.viewport.currentTime}
        parameterValues={props.viewport.parameterValues}
        parameterValueMap={props.viewport.parameterValueMap}
        selectedPartIds={props.viewport.selectedPartIds}
        selectedVertexIndex={props.viewport.activeVertexIndex}
      />
      <Show when={!props.editingMesh}>
        <SkinningTools
          sourceDocument={props.viewport.sourceDocument ?? props.viewport.document}
          document={props.viewport.document}
          activePartId={props.viewport.activePartId}
          activeBindingId={props.viewport.activeBindingId}
          parameterValues={props.viewport.parameterValues}
          parameterValueMap={props.viewport.parameterValueMap}
          motionId={props.viewport.motionId}
          previewTime={props.viewport.currentTime}
          editMode={props.viewport.editMode}
          onDocumentChange={props.viewport.onDocumentChange}
          onEditStart={props.viewport.onDeformerEditStart}
          onEditEnd={props.viewport.onDeformerEditEnd}
          renderControls={renderControls}
        />
        <DeformerEditor
          brushControlsExternal
          brushControlsMount={props.visible ? props.viewport.brushControlsMount : undefined}
          brushSettingsMount={props.viewport.brushSettingsMount}
          deformerMode={props.viewport.deformerMode}
          onDeformerModeChange={props.viewport.onDeformerModeChange}
          renderControls={renderControls}
          activeBindingId={props.viewport.activeBindingId}
          activeKeyformValues={props.viewport.activeKeyformValues}
          activeNodeId={props.viewport.activeNodeId}
          controlSelection={props.viewport.deformerControlSelection}
          document={props.viewport.document}
          editMode={props.viewport.editMode}
          onDocumentChange={props.viewport.onDocumentChange}
          onEditEnd={props.viewport.onDeformerEditEnd}
          onEditStart={props.viewport.onDeformerEditStart}
          previewDocument={props.viewport.previewDocument}
          targetNodeIds={props.viewport.targetNodeIds}
        />
      </Show>
    </div>
  )
}
