import {getMeshEditingIssue} from './move-mesh-vertex'
import {MeshModeControl} from './internal/MeshModeControl'
import {getRestPreview} from './internal/rest-preview'
import {getMotionParameterOverrides} from './internal/get-motion-parameter-overrides'
import {getSceneNode} from './internal/scene-graph'
import {EditorToggleButton} from '../design-system'
import {Viewport} from './viewport/Viewport'
import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import type {PlayerFrame} from '../player'
import type {EditorViewportProps} from './editor-viewport/types'
import {EditorViewportOverlays} from './editor-viewport/EditorViewportOverlays'

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
  const playbackParameters = createMemo(() => {
    if (editingMesh()) {
      return undefined
    }
    return props.editMode === 'motion'
      ? getMotionParameterOverrides({
          document: displayDocument(),
          motionId: props.motionId,
          parameterValues: props.parameterValueMap,
        })
      : props.parameterValueMap
  })
  const [editingVisible, setEditingVisible] = createSignal(true)
  const editingControlsVisible = () =>
    editingVisible() && !props.playbackActive && !props.selectionPending
  const spatialSurface = createMemo(() => {
    if (!editingControlsVisible() || editingMesh() || props.activeNodeId === undefined) {
      return undefined
    }
    const document = props.previewDocument ?? editDocument()
    const node = getSceneNode(document, props.activeNodeId)
    return node?.kind === 'deformer' && node.deformerType === 'spatial'
      ? {document, node}
      : undefined
  })
  const [displayMount, setDisplayMount] = createSignal<HTMLDivElement>()
  const meshControls = (
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
      <Show
        when={
          !props.selectionPending &&
          props.brushControlsMount === undefined &&
          props.editMode === 'parameter' &&
          props.activePartId !== undefined
        }
      >
        {props.renderEditingControls?.(meshControls) ?? meshControls}
      </Show>
      <Viewport
        owner="editor"
        document={displayDocument()}
        physicsPreview={!editingMesh() && (props.physicsPreview ?? true)}
        motionId={props.editMode === 'parameter' ? undefined : props.motionId}
        onFrame={(frame: PlayerFrame) => props.onTimeChange?.(frame.time)}
        onPlayerChange={props.onPlayerChange}
        onStatusChange={props.onStatusChange}
        parameterValues={playbackParameters()}
        spatialSurface={spatialSurface()}
        fitRevision={props.fitRevision}
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
                    ? 'puppet-icon puppet-icon-editing-overlay'
                    : 'puppet-icon puppet-icon-editing-overlay-off'
                }
                aria-hidden="true"
              />
            </EditorToggleButton>
            <div class="viewport-display" ref={setDisplayMount} />
          </>
        }
        controls={
          <div class="viewport-tools">
            <Show when={!editingMesh() && !props.selectionPending}>{props.overlay}</Show>
          </div>
        }
      >
        <EditorViewportOverlays
          displayMount={displayMount()}
          document={editDocument()}
          editingMesh={editingMesh()}
          meshControls={meshControls}
          onMeshNotice={setMeshNotice}
          viewport={props}
          visible={editingControlsVisible()}
        />
      </Viewport>
    </section>
  )
}

export type {EditorViewportProps} from './editor-viewport/types'
