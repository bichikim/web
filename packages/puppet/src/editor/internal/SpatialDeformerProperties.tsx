import {createSignal, For, Show} from 'solid-js'
import {EditorButton, EditorNumberField, EditorSelect} from '../../design-system'
import {generateSpatialMesh} from '../../deformation/generate-spatial-mesh'
import {importSpatialMesh} from '../../deformation/import-spatial-mesh'
import type {PuppetParameterValues} from '../../deformation'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetSceneDeformerNode,
  type PuppetSpatialObject,
} from '../../player'
import {removeSpatialMesh} from './remove-spatial-mesh'
import {setSpatialDeformerTransform} from './set-spatial-deformer-transform'
import {setSpatialMesh} from './set-spatial-mesh'
import {updateNode} from './scene-tree'
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
const MAX_FILE_BYTES = 20_000_000
const MIN_SPATIAL_SCALE = 0.001

// eslint-disable-next-line max-lines-per-function -- Keep the three transform axes and mesh controls in one inspector fieldset.
export const SpatialDeformerProperties = (props: SpatialDeformerPropertiesProps) => {
  let fileInput: HTMLInputElement | undefined
  const linkedParts = () =>
    props.document.parts.filter((part) => part.spatial?.groupId === props.node.id)
  const attachedVertexCount = () => {
    const hasMesh = props.node.spatialMesh !== undefined
    return linkedParts().reduce(
      (count, part) =>
        count +
        (part.spatial?.attachments?.length ?? (hasMesh ? part.mesh.vertices.length / 2 : 0)),
      0,
    )
  }
  const [dialogOpen, setDialogOpen] = createSignal(false)
  const [meshError, setMeshError] = createSignal<string | null>(null)
  const update = (patch: Partial<PuppetSceneDeformerNode>) => {
    const scene = getDocumentScene(props.document)
    props.onDocumentChange?.({
      ...props.document,
      scene: {
        ...scene,
        roots: updateNode(scene.roots, props.node.id, (node) =>
          node.kind === 'deformer' ? {...node, ...patch} : node,
        ),
      },
    })
  }
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
  const importFile = async (file: File | undefined) => {
    if (file === undefined) {
      return
    }
    try {
      if (file.size > MAX_FILE_BYTES) {
        throw new Error('20MB 이하의 GLB 파일을 선택해 주세요.')
      }
      const mesh = importSpatialMesh(await file.arrayBuffer(), file.name, props.node.bounds)
      const document = setSpatialMesh({document: props.document, mesh, nodeId: props.node.id})
      if (document === undefined) {
        setMeshError('메시 앞면을 이미지에 연결할 수 없습니다. 위치와 잠금 상태를 확인해 주세요.')
        return
      }
      props.onDocumentChange?.(document)
      setMeshError(null)
    } catch (error) {
      setMeshError(error instanceof Error ? error.message : 'GLB 메시를 가져올 수 없습니다.')
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
    <fieldset class="deformer-properties" aria-label="3D 디포머">
      <legend>3D 디포머</legend>
      <section aria-label="3D 메시" class="grid gap-2">
        <strong>3D 메시</strong>
        <p class="m-0 text-xs opacity-70">
          {linkedParts().length === 0
            ? '변형할 파트를 이 3D 디포머 안에 넣으세요.'
            : `포함된 파트 ${linkedParts().length}개 · 메시와 이미지 위치를 맞춰 주세요.`}
        </p>
        <p class="m-0 text-xs opacity-70">
          {props.node.spatialMesh === undefined
            ? '연결된 메시 없음'
            : `${
                props.node.spatialMesh.source.kind === 'imported'
                  ? props.node.spatialMesh.source.name
                  : '도형 조합 메시'
              } · ${props.node.spatialMesh.vertices.length / SPATIAL_COORDINATES} 정점`}
        </p>
        <Show when={attachedVertexCount() > 0}>
          <p class="m-0 text-xs opacity-70">
            이미지 정점 {attachedVertexCount()}개가 메시 표면에 연결됨
          </p>
        </Show>
        <Show when={props.node.spatialMesh !== undefined}>
          <div class="grid gap-2" role="group" aria-label="3D 메시 위치">
            <strong>메시 위치</strong>
            <p class="m-0 text-xs opacity-70">
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
        <div class="flex flex-wrap gap-2">
          <EditorButton type="button" disabled={props.disabled} onClick={() => setDialogOpen(true)}>
            {props.node.spatialMesh?.source.kind === 'generated' ||
            props.node.spatialMesh?.source.kind === 'authored'
              ? '메시 편집'
              : '메시 만들기'}
          </EditorButton>
          <EditorButton type="button" disabled={props.disabled} onClick={() => fileInput?.click()}>
            메시 가져오기 (GLB)
          </EditorButton>
          <Show when={props.node.spatialMesh !== undefined}>
            <EditorButton type="button" disabled={props.disabled} onClick={removeMesh}>
              메시 제거
            </EditorButton>
          </Show>
          <input
            ref={(element) => {
              fileInput = element
            }}
            class="sr-only"
            type="file"
            tabindex={-1}
            accept=".glb,model/gltf-binary"
            disabled={props.disabled}
            aria-label="3D 메시 가져오기"
            onChange={async (event) => importFile(event.currentTarget.files?.[0])}
          />
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
            <label>
              회전 파라미터 {axis}
              <EditorSelect
                disabled={props.disabled}
                label={`3D 회전 파라미터 ${axis}`}
                optionLabel={(id) =>
                  id === ''
                    ? '없음'
                    : (props.document.parameters?.find((parameter) => parameter.id === id)?.name ??
                      id)
                }
                options={[
                  '',
                  ...(props.document.parameters ?? []).map((parameter) => parameter.id),
                ]}
                value={props.node.spatialRotationParameterIds?.[index()] ?? ''}
                onChange={(id) => {
                  const spatialRotationParameterIds: [string | null, string | null, string | null] =
                    [...(props.node.spatialRotationParameterIds ?? [null, null, null])]
                  spatialRotationParameterIds[index()] = id === '' ? null : id
                  update({spatialRotationParameterIds})
                }}
              />
            </label>
          </>
        )}
      </For>
      <SpatialMeshDialog
        bounds={props.node.bounds}
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
