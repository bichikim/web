import {
  composeParameterVertices,
  type PuppetParameterValueMap,
  type PuppetParameterValues,
} from '../deformation'
import type {PuppetDocument, PuppetPart} from '../player/document'
import {sampleMotionVertices} from '../player/internal/motion'
import {movePartVertex, type VertexPoint} from './edit-document'
import {setVertexKeyframe} from './internal/motion-keyframes'
import {getEditErrorMessage} from './internal/notices'
import {setParameterKeyformVertex} from './internal/parameter-keyforms'
import type {MeshEditorProps} from './mesh-editor-contract'

const COORDINATES_PER_VERTEX = 2

interface CommitVertexMoveOptions extends VertexPoint {
  readonly editMode: 'motion' | 'parameter'
  readonly document: PuppetDocument
  readonly keyframeTime: number | null
  readonly bindingId?: string
  readonly parameterValueMap?: PuppetParameterValueMap
  readonly parameterValues: PuppetParameterValues | null
  readonly part: PuppetPart
  readonly vertexIndex: number
}

interface CommitVertexMoveSuccess {
  readonly document: PuppetDocument
  readonly keyframeTime: number | null
  readonly ok: true
}

interface CommitVertexMoveFailure {
  readonly message: string
  readonly ok: false
}

type CommitVertexMoveResult = CommitVertexMoveFailure | CommitVertexMoveSuccess

export const canEditSelectedKeyform = (props: MeshEditorProps) =>
  props.meshEditing ||
  props.editMode !== 'parameter' ||
  (props.activeBindingId !== undefined &&
    props.activeKeyformValues !== null &&
    props.activeKeyformValues !== undefined)

export const getVertexMoveNotice = (
  editMode: MeshEditorProps['editMode'],
  keyframeTime: number | null,
  vertexIndex: number,
) => {
  if (editMode === 'parameter') {
    return '선택한 Parameter 키폼을 변경했습니다.'
  }

  return keyframeTime === null
    ? `정점 ${vertexIndex + 1} 위치를 변경했습니다.`
    : `${keyframeTime.toFixed(2)}초에 정점 ${vertexIndex + 1} 키프레임을 저장했습니다.`
}

export const commitVertexMove = (options: CommitVertexMoveOptions): CommitVertexMoveResult => {
  if (options.editMode === 'parameter') {
    if (options.bindingId === undefined || options.parameterValues === null) {
      return {message: '편집할 Parameter 키폼을 먼저 선택하세요.', ok: false}
    }

    const activePart = options.part
    const otherBindings = (options.document.parameterBindings ?? []).filter(
      (binding) => binding.id !== options.bindingId,
    )
    const otherVertices = composeParameterVertices({
      document: {...options.document, parameterBindings: otherBindings},
      parameterValues: options.parameterValueMap,
      partId: activePart.id,
      restVertices: activePart.mesh.vertices,
    })
    const coordinateIndex = options.vertexIndex * COORDINATES_PER_VERTEX
    const restX = activePart.mesh.vertices[coordinateIndex] ?? options.x
    const restY = activePart.mesh.vertices[coordinateIndex + 1] ?? options.y
    const otherX = otherVertices[coordinateIndex] ?? restX
    const otherY = otherVertices[coordinateIndex + 1] ?? restY
    const document = setParameterKeyformVertex({
      bindingId: options.bindingId,
      document: options.document,
      partId: options.part.id,
      values: options.parameterValues,
      vertexIndex: options.vertexIndex,
      x: options.x - otherX + restX,
      y: options.y - otherY + restY,
    })

    return document === undefined
      ? {message: '정점 위치가 메시를 뒤집거나 유효 범위를 벗어났습니다.', ok: false}
      : {document, keyframeTime: options.keyframeTime, ok: true}
  }

  const [motion] = options.document.motions
  const sampledVertices =
    options.keyframeTime === null || motion === undefined
      ? options.part.mesh.vertices
      : sampleMotionVertices({
          motion,
          partId: options.part.id,
          restVertices: options.part.mesh.vertices,
          time: options.keyframeTime,
        })
  const validationDocument = {
    ...options.document,
    parts: options.document.parts.map((part) =>
      part.id === options.part.id
        ? {...part, mesh: {...part.mesh, vertices: sampledVertices}}
        : part,
    ),
  }
  const result = movePartVertex({
    document: validationDocument,
    partId: options.part.id,
    vertexIndex: options.vertexIndex,
    x: options.x,
    y: options.y,
  })

  if (!result.ok) {
    return {message: getEditErrorMessage(result.error.code), ok: false}
  }

  if (options.keyframeTime === null || motion === undefined) {
    return {document: result.document, keyframeTime: null, ok: true}
  }

  const document = setVertexKeyframe({
    document: options.document,
    motionId: motion.id,
    partId: options.part.id,
    point: {x: options.x, y: options.y},
    time: options.keyframeTime,
    vertexIndex: options.vertexIndex,
  })

  return document === undefined
    ? {message: '선택한 시간에 정점 키프레임을 만들지 못했습니다.', ok: false}
    : {document, keyframeTime: options.keyframeTime, ok: true}
}
