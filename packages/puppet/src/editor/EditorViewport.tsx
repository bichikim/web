import {getMeshEditingIssue} from './move-mesh-vertex'
import {MeshModeControl} from './internal/MeshModeControl'
import {getRestPreview} from './internal/rest-preview'
import {EditorToggleButton} from '../design-system'
import {CameraViewport} from './internal/CameraViewport'
import {SkinningTools} from './internal/SkinningTools'
import type {DeformerEditMode} from './internal/DeformerMode'
import {createEffect, createMemo, createSignal, type JSX, Show} from 'solid-js'
import {Portal} from 'solid-js/web'

import type {PuppetParameterValueMap, PuppetParameterValues} from '../deformation'
import type {Player, PlayerFrame, PuppetDocument} from '../player'
import {DeformerEditor} from './internal/DeformerEditor'
import type {DeformerControlSelection} from './internal/deformer-control-selection'
import {MeshEditor} from './MeshEditor'
import {PlayerCanvas, type PlayerCanvasStatus} from './PlayerCanvas'

export interface EditorViewportProps {
  readonly brushControlsMount?: HTMLDivElement
  readonly brushSettingsMount?: HTMLDivElement
  readonly physicsPreview?: boolean
  readonly meshEditingDisabled?: boolean
  readonly motionId?: string
  readonly onMeshEditingStart?: () => void
  readonly onRestDocumentChange?: (document: PuppetDocument) => void
  readonly fitRevision?: number
  readonly overlay?: JSX.Element
  readonly sourceDocument?: PuppetDocument
  readonly deformerMode?: DeformerEditMode
  readonly onDeformerModeChange?: (mode: DeformerEditMode) => void
  readonly renderEditingControls?: (controls: JSX.Element) => JSX.Element
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
  readonly playbackActive?: boolean
  readonly parameterValues?: PuppetParameterValues
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly previewDocument?: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetNodeIds?: ReadonlyArray<string>
}

const useViewportMeshIssue = (props: EditorViewportProps) => {
  const issue = createMemo(() =>
    props.meshEditingDisabled
      ? '임시 변경을 저장하거나 삭제한 후 메시를 편집하세요.'
      : getMeshEditingIssue({
          document: props.sourceDocument ?? props.document,
          partId: props.activePartId,
        }),
  )
  return issue
}

const getPlaybackDocument = (options: EditorViewportProps) =>
  options.editMode === 'parameter' ? {...options.document, motions: []} : options.document

const getEditingVisibilityTitle = (visible: boolean, playbackActive: boolean) =>
  playbackActive ? '재생 중 편집 UI 숨김' : visible ? '편집 UI 숨기기' : '편집 UI 표시'

interface EditingOverlaysProps {
  readonly displayMount?: HTMLDivElement
  readonly document: PuppetDocument
  readonly editingMesh: boolean
  readonly onMeshNotice: (message: string | null) => void
  readonly viewport: EditorViewportProps
  readonly visible: boolean
}

const EditingOverlays = (props: EditingOverlaysProps) => {
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
        brushControlsMount={props.viewport.brushControlsMount}
        brushSettingsMount={props.viewport.brushSettingsMount}
        brushControlsExternal
        meshEditing={props.editingMesh}
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
          previewTime={props.viewport.currentTime}
          editMode={props.viewport.editMode}
          onDocumentChange={props.viewport.onDocumentChange}
          onEditStart={props.viewport.onDeformerEditStart}
          onEditEnd={props.viewport.onDeformerEditEnd}
          renderControls={renderControls}
        />
        <DeformerEditor
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

export const EditorViewport = (props: EditorViewportProps) => {
  const [meshNotice, setMeshNotice] = createSignal<string | null>(null)
  const [meshEditing, setMeshEditing] = createSignal(false)
  const meshIssue = useViewportMeshIssue(props)
  createEffect(() => {
    if (props.editMode !== 'parameter' || meshIssue() !== null) {
      setMeshEditing(false)
      setMeshNotice(null)
    }
  })
  const editingMesh = () => meshEditing() && props.editMode === 'parameter' && meshIssue() === null
  const editDocument = () => (editingMesh() ? props.sourceDocument : undefined) ?? props.document
  const displayDocument = createMemo(() =>
    editingMesh() ? getRestPreview(editDocument()) : getPlaybackDocument(props),
  )
  const [editingVisible, setEditingVisible] = createSignal(true)
  const editingControlsVisible = () => editingVisible() && !props.playbackActive
  const [displayMount, setDisplayMount] = createSignal<HTMLDivElement>()
  const meshControls = (
    <Show when={props.editMode === 'parameter' && props.activePartId !== undefined}>
      <MeshModeControl
        editing={editingMesh()}
        notice={meshNotice() ?? undefined}
        disabledReason={meshIssue() ?? undefined}
        onChange={(editing) => {
          setMeshNotice(null)
          if (editing) {
            props.onMeshEditingStart?.()
          }
          setMeshEditing(editing)
        }}
      />
    </Show>
  )
  return (
    <section
      aria-label={
        props.editMode === 'parameter'
          ? 'Parameter 정점 형태 편집'
          : '저장 데이터 플레이어 미리보기'
      }
      class="viewport-panel"
    >
      {props.renderEditingControls?.(meshControls) ?? meshControls}
      <CameraViewport
        fitRevision={props.fitRevision}
        width={props.document.viewport.width}
        height={props.document.viewport.height}
        viewControls={
          <>
            <EditorToggleButton
              size="md"
              aria-label="편집 UI 표시"
              disabled={props.playbackActive}
              pressed={editingControlsVisible()}
              title={getEditingVisibilityTitle(editingVisible(), props.playbackActive ?? false)}
              onClick={() => setEditingVisible(!editingVisible())}
            >
              <span
                class={
                  editingVisible()
                    ? 'puppet-icon puppet-icon-eye'
                    : 'puppet-icon puppet-icon-eye-off'
                }
                aria-hidden="true"
              />
            </EditorToggleButton>
            <div class="viewport-display" ref={setDisplayMount} />
          </>
        }
        controls={
          <div class="viewport-tools">
            <Show when={!editingMesh()}>{props.overlay}</Show>
          </div>
        }
      >
        <PlayerCanvas
          physicsPreview={!editingMesh() && (props.physicsPreview ?? true)}
          document={displayDocument()}
          motionId={props.editMode === 'parameter' ? undefined : props.motionId}
          onFrame={(frame: PlayerFrame) => props.onTimeChange?.(frame.time)}
          onPlayerChange={props.onPlayerChange}
          onStatusChange={props.onStatusChange}
          parameterValues={editingMesh() ? undefined : props.parameterValueMap}
        />
        <EditingOverlays
          displayMount={displayMount()}
          document={editDocument()}
          editingMesh={editingMesh()}
          onMeshNotice={setMeshNotice}
          viewport={props}
          visible={editingControlsVisible()}
        />
      </CameraViewport>
    </section>
  )
}
