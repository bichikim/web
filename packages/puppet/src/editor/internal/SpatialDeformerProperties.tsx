import {createMemo, createSignal, For, Show} from 'solid-js'
import {EditorButton, EditorNumberField} from '../../design-system'
import {generateSpatialMesh} from '../../deformation/generate-spatial-mesh'
import type {PuppetParameterValues} from '../../deformation'
import {
  getDocumentScene,
  getRenderableParts,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSpatialObject,
} from '../../player'
import {removeSpatialMesh} from './remove-spatial-mesh'
import {setSpatialDeformerTransform} from './set-spatial-deformer-transform'
import {setSpatialMesh} from './set-spatial-mesh'
import {SpatialMeshDialog} from './SpatialMeshDialog'

interface SpatialDeformerPropertiesProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly disabled?: boolean
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly node: PuppetSceneDeformerNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly targetNodeIds?: ReadonlyArray<string>
}

const axes = ['X', 'Y', 'Z'] as const
const SPATIAL_COORDINATES = 3
const MIN_SPATIAL_SCALE = 0.001

// eslint-disable-next-line max-lines-per-function -- Keep the three transform axes and mesh controls in one inspector fieldset.
export const SpatialDeformerProperties = (props: SpatialDeformerPropertiesProps) => {
  const linkedParts = () =>
    props.document.parts.filter((part) => part.spatial?.groupId === props.node.id)
  const referenceParts = createMemo(() =>
    getRenderableParts(props.document).filter((part) => part.spatial?.groupId === props.node.id),
  )
  const meshSummary = () => {
    const mesh = props.node.spatialMesh
    if (mesh === undefined) {
      return undefined
    }
    const name = mesh.source.kind === 'imported' ? mesh.source.name : '도형 조합 메시'
    return `${name} · ${mesh.vertices.length / SPATIAL_COORDINATES} 정점`
  }
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [meshError, setMeshError] = createSignal<string | null>(null)
  const updateSpatial = (
    property:
      | 'spatialMeshPosition'
      | 'spatialOrigin'
      | 'spatialRotation'
      | 'spatialScale'
      | 'spatialTranslation',
    axis: number,
    value: number,
  ) => {
    const fallback = property === 'spatialScale' ? ([1, 1, 1] as const) : ([0, 0, 0] as const)
    const coordinates: [number, number, number] = [...(props.node[property] ?? fallback)]
    coordinates[axis] = value
    const document = setSpatialDeformerTransform({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      document: props.document,
      editMode: props.editMode,
      nodeId: props.node.id,
      previewDeformer: props.node,
      property,
      targetNodeIds: props.targetNodeIds,
      value: coordinates,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
    return document !== undefined
  }
  const updateMeshPosition = (axis: number, value: number) => {
    if (updateSpatial('spatialMeshPosition', axis, value)) {
      setMeshError(null)
    } else {
      setMeshError('메시 위치를 적용할 수 없습니다. 메시와 파트의 연결 상태를 확인해 주세요.')
    }
  }
  const applyObjects = (objects: ReadonlyArray<PuppetSpatialObject>) => {
    try {
      const mesh = generateSpatialMesh({objects})
      const document = setSpatialMesh({document: props.document, mesh, nodeId: props.node.id})
      if (document === undefined) {
        setMeshError('메시 앞면을 이미지에 연결할 수 없습니다. 위치와 잠금 상태를 확인해 주세요.')
        return false
      }
      props.onDocumentChange?.(document)
      setMeshError(null)
      return true
    } catch (error) {
      setMeshError(error instanceof Error ? error.message : '메시를 만들 수 없습니다.')
      return false
    }
  }
  const removeMesh = () => {
    const document = removeSpatialMesh({document: props.document, nodeId: props.node.id})
    if (document !== undefined) {
      props.onDocumentChange?.(document)
      setMeshError(null)
    }
  }
  return (
    <fieldset class="deformer-properties spatial-deformer-properties" aria-label="3D 디포머">
      <legend>3D 디포머</legend>
      <section aria-label="3D 메시" class="grid gap-editor-field">
        <Show when={meshSummary()}>
          {(summary) => <p class="m-0 editor-type-caption opacity-70">{summary()}</p>}
        </Show>
        <Show when={props.node.spatialMesh !== undefined}>
          <div class="grid gap-editor-field" role="group" aria-label="3D 메시 위치">
            <strong>메시 위치</strong>
            <p class="m-0 editor-type-caption opacity-70">
              키폼에서는 메시 표면만 옮깁니다. 아래 이동은 변형된 이미지를 옮깁니다.
            </p>
            <For each={axes}>
              {(axis, index) => (
                <label>
                  메시 위치 {axis}
                  <EditorNumberField
                    disabled={props.disabled}
                    label={`3D 메시 위치 ${axis}`}
                    step="any"
                    value={props.node.spatialMeshPosition?.[index()] ?? 0}
                    onEditEnd={props.onEditEnd}
                    onEditStart={props.onEditStart}
                    onValueChange={(value) => updateMeshPosition(index(), value)}
                  />
                </label>
              )}
            </For>
          </div>
        </Show>
        <div class="flex flex-wrap gap-editor-field">
          <EditorButton type="button" disabled={props.disabled} onClick={() => setDialogOpen(true)}>
            {props.node.spatialMesh === undefined ? '메시 만들기' : '메시 편집'}
          </EditorButton>
          <Show when={props.node.spatialMesh !== undefined}>
            <EditorButton type="button" disabled={props.disabled} onClick={removeMesh}>
              메시 제거
            </EditorButton>
          </Show>
        </div>
        <Show when={meshError()}>
          {(message) => (
            <p role="alert" class="auto-mesh-error">
              {message()}
            </p>
          )}
        </Show>
      </section>
      <For each={axes}>
        {(axis, index) => (
          <>
            <label>
              이동 {axis}
              <EditorNumberField
                disabled={props.disabled}
                label={`3D 이동 ${axis}`}
                step="any"
                value={props.node.spatialTranslation?.[index()] ?? 0}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) => updateSpatial('spatialTranslation', index(), value)}
              />
            </label>
            <label>
              크기 {axis} (배율)
              <EditorNumberField
                disabled={props.disabled}
                label={`3D 크기 ${axis}`}
                minimum={MIN_SPATIAL_SCALE}
                step="any"
                value={props.node.spatialScale?.[index()] ?? 1}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) => updateSpatial('spatialScale', index(), value)}
              />
            </label>
            <label>
              회전 {axis} (°)
              <EditorNumberField
                disabled={props.disabled}
                label={`3D 회전 ${axis}`}
                step="any"
                value={props.node.spatialRotation?.[index()] ?? 0}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) => updateSpatial('spatialRotation', index(), value)}
              />
            </label>
            <label>
              변형 중심 {axis}
              <EditorNumberField
                disabled={props.disabled}
                label={`3D 변형 중심 ${axis}`}
                step="any"
                value={props.node.spatialOrigin?.[index()] ?? 0}
                onEditEnd={props.onEditEnd}
                onEditStart={props.onEditStart}
                onValueChange={(value) => updateSpatial('spatialOrigin', index(), value)}
              />
            </label>
          </>
        )}
      </For>
      <SpatialMeshDialog
        bounds={props.node.bounds}
        meshPosition={props.node.spatialMeshPosition}
        referenceParts={referenceParts()}
        targetParts={linkedParts()}
        errorMessage={meshError()}
        initialOperations={
          props.node.spatialMesh?.source.kind === 'generated'
            ? props.node.spatialMesh.source.operations
            : undefined
        }
        initialObjects={
          props.node.spatialMesh?.source.kind === 'authored'
            ? props.node.spatialMesh.source.objects
            : undefined
        }
        initialMesh={
          props.node.spatialMesh?.source.kind === 'imported' ? props.node.spatialMesh : undefined
        }
        isOpen={dialogOpen()}
        onApply={applyObjects}
        onOpenChange={(open) => {
          if (open) {
            setMeshError(null)
          }
          setDialogOpen(open)
        }}
      />
    </fieldset>
  )
}
