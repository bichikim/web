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
  readonly meshEditingDisabled?: boolean
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
  readonly parameterValues?: PuppetParameterValues
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly previewDocument?: PuppetDocument
  readonly selectedPartIds?: ReadonlyArray<string>
  readonly targetNodeIds?: ReadonlyArray<string>
}

const useViewportMeshIssue = (props: EditorViewportProps) =>
  createMemo(() =>
    props.meshEditingDisabled
      ? '임시 변경을 저장하거나 삭제한 후 메시를 편집하세요.'
      : getMeshEditingIssue({
          document: props.sourceDocument ?? props.document,
          partId: props.activePartId,
        }),
  )

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
  const editDocument = () =>
    editingMesh() ? (props.sourceDocument ?? props.document) : props.document
  const displayDocument = createMemo(() =>
    editingMesh() ? getRestPreview(editDocument()) : props.document,
  )

  const [editingVisible, setEditingVisible] = createSignal(true)
  const [displayMount, setDisplayMount] = createSignal<HTMLDivElement>()
  const meshControls = (
    <>
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
    </>
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
              pressed={editingVisible()}
              title={editingVisible() ? '편집 UI 숨기기' : '편집 UI 표시'}
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
          document={displayDocument()}
          onFrame={(frame: PlayerFrame) => props.onTimeChange?.(frame.time)}
          onPlayerChange={props.onPlayerChange}
          onStatusChange={props.onStatusChange}
          parameterValues={editingMesh() ? undefined : props.parameterValueMap}
        />
        <div
          class="editing-overlays"
          data-hidden={!editingVisible()}
          inert={!editingVisible()}
          aria-hidden={!editingVisible()}
        >
          <MeshEditor
            meshEditing={editingMesh()}
            renderDisplayControls={(controls) => (
              <Show when={displayMount()}>
                {(mount) => <Portal mount={mount()}>{controls}</Portal>}
              </Show>
            )}
            activeBindingId={props.activeBindingId}
            activeKeyformValues={props.activeKeyformValues}
            activePartId={props.activePartId}
            document={editDocument()}
            editMode={props.editMode}
            onDocumentChange={editingMesh() ? props.onRestDocumentChange : props.onDocumentChange}
            onNotice={editingMesh() ? setMeshNotice : props.onNotice}
            onVertexEditStart={props.onVertexEditStart}
            onVertexSelect={props.onVertexSelect}
            previewTime={props.currentTime}
            parameterValues={props.parameterValues}
            parameterValueMap={props.parameterValueMap}
            selectedPartIds={props.selectedPartIds}
            selectedVertexIndex={props.activeVertexIndex}
          />
          <Show when={!editingMesh()}>
            <SkinningTools
              sourceDocument={props.sourceDocument ?? props.document}
              document={props.document}
              activePartId={props.activePartId}
              activeBindingId={props.activeBindingId}
              parameterValues={props.parameterValues}
              parameterValueMap={props.parameterValueMap}
              previewTime={props.currentTime}
              editMode={props.editMode}
              onDocumentChange={props.onDocumentChange}
              onEditStart={props.onDeformerEditStart}
              onEditEnd={props.onDeformerEditEnd}
              renderControls={props.renderEditingControls}
            />
            <DeformerEditor
              deformerMode={props.deformerMode}
              onDeformerModeChange={props.onDeformerModeChange}
              renderControls={props.renderEditingControls}
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
          </Show>
        </div>
      </CameraViewport>
    </section>
  )
}
