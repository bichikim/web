import {type Accessor, createEffect, createMemo, createSignal, type Setter, untrack} from 'solid-js'

import type {PuppetDocument, PuppetPart} from '../player/document'
import {sampleMotionVertices} from '../player/internal/motion'
import {getScenePartStates} from '../player/scene'
import {addPartVertex, deletePartVertex, movePartVertex, type VertexPoint} from './edit-document'
import {
  getIndexedVertices,
  getMeshViewTriangles,
  type IndexedVertex,
  type MeshTriangle,
  snapPointToEdge,
} from './internal/mesh-view'
import {setVertexKeyframe} from './internal/motion-keyframes'
import {getEditErrorMessage} from './internal/notices'
import {
  getDocumentParameters,
  sampleParameterVertices,
  setParameterKeyformVertex,
} from './internal/parameter-keyforms'
import {getEditorPoint, getEditorViewBox} from './internal/viewport'
import type {MeshEditorProps} from './mesh-editor-contract'

export type {IndexedVertex, MeshTriangle} from './internal/mesh-view'

export type MeshEditTool = 'add' | 'select'

export interface UseMeshEditorResult {
  readonly canEditTopology: Accessor<boolean>
  readonly handleAddVertex: (event: MouseEvent) => void
  readonly handleDeleteVertex: () => void
  readonly handlePointerCancel: () => void
  readonly handlePointerDown: (event: PointerEvent, partId: string, vertex: IndexedVertex) => void
  readonly handlePointerEnd: () => void
  readonly handlePointerMove: (event: PointerEvent) => void
  readonly part: Accessor<PuppetPart | undefined>
  readonly partViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly selectAddTool: () => void
  readonly selectMoveTool: () => void
  readonly selectedVertex: Accessor<number | null>
  readonly tool: Accessor<MeshEditTool>
  readonly triangles: Accessor<ReadonlyArray<MeshTriangle>>
  readonly vertexRadius: Accessor<number>
  readonly vertices: Accessor<ReadonlyArray<IndexedVertex>>
}

export interface MeshPartView {
  readonly partId: string
  readonly triangles: ReadonlyArray<MeshTriangle>
  readonly vertices: ReadonlyArray<IndexedVertex>
}

interface MeshEditorState {
  readonly draftPoint: Accessor<VertexPoint | null>
  readonly dragStartPoint: Accessor<VertexPoint | null>
  readonly draggingTime: Accessor<number | null>
  readonly draggingVertex: Accessor<number | null>
  readonly part: Accessor<PuppetPart | undefined>
  readonly partViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly selectedVertex: Accessor<number | null>
  readonly setDraftPoint: Setter<VertexPoint | null>
  readonly setDragStartPoint: Setter<VertexPoint | null>
  readonly setDraggingTime: Setter<number | null>
  readonly setDraggingVertex: Setter<number | null>
  readonly setFocusedPartId: Setter<string | null>
  readonly setSelectedVertex: Setter<number | null>
  readonly setTool: Setter<MeshEditTool>
  readonly tool: Accessor<MeshEditTool>
  readonly triangles: Accessor<ReadonlyArray<MeshTriangle>>
  readonly vertexRadius: Accessor<number>
  readonly vertices: Accessor<ReadonlyArray<IndexedVertex>>
}

const COORDINATES_PER_VERTEX = 2
const VERTEX_RADIUS_DIVISOR = 150
const MINIMUM_VERTEX_RADIUS = 3
const EDGE_SNAP_RADIUS_MULTIPLIER = 2

interface CommitVertexMoveOptions extends VertexPoint {
  readonly editMode: 'motion' | 'parameter'
  readonly document: PuppetDocument
  readonly keyframeTime: number | null
  readonly parameterId?: string
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

const canEditSelectedKeyform = (props: MeshEditorProps) =>
  props.editMode !== 'parameter' ||
  (props.activeParameterId !== undefined &&
    props.activeKeyformValue !== null &&
    props.activeKeyformValue !== undefined)

const getVertexMoveNotice = (
  editMode: MeshEditorProps['editMode'],
  keyframeTime: number | null,
  vertexIndex: number,
) => {
  if (editMode === 'parameter') {
    return `${keyframeTime?.toFixed(2)} 값의 Parameter 키폼을 변경했습니다.`
  }

  return keyframeTime === null
    ? `정점 ${vertexIndex + 1} 위치를 변경했습니다.`
    : `${keyframeTime.toFixed(2)}초에 정점 ${vertexIndex + 1} 키프레임을 저장했습니다.`
}

const commitVertexMove = (options: CommitVertexMoveOptions): CommitVertexMoveResult => {
  if (options.editMode === 'parameter') {
    if (options.parameterId === undefined || options.keyframeTime === null) {
      return {message: '편집할 Parameter 키폼을 먼저 선택하세요.', ok: false}
    }

    const document = setParameterKeyformVertex({
      document: options.document,
      parameterId: options.parameterId,
      partId: options.part.id,
      value: options.keyframeTime,
      vertexIndex: options.vertexIndex,
      x: options.x,
      y: options.y,
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

const getPointerPoint = (
  event: PointerEvent | MouseEvent,
  svgElement: SVGSVGElement,
  document: PuppetDocument,
): VertexPoint =>
  getEditorPoint({
    bounds: svgElement.getBoundingClientRect(),
    clientPoint: {x: event.clientX, y: event.clientY},
    viewBox: getEditorViewBox(document),
  })

const getPartPreviewVertices = (props: MeshEditorProps, part: PuppetPart) => {
  const parameter = getDocumentParameters(props.document).find(
    (candidate) => candidate.id === props.activeParameterId,
  )

  return props.editMode === 'parameter'
    ? sampleParameterVertices({
        parameter,
        partId: part.id,
        restVertices: part.mesh.vertices,
        value: props.parameterValue ?? parameter?.defaultValue ?? 0,
      })
    : sampleMotionVertices({
        motion: props.document.motions[0],
        partId: part.id,
        restVertices: part.mesh.vertices,
        time: props.previewTime ?? 0,
      })
}

const createMeshEditorState = (props: MeshEditorProps): MeshEditorState => {
  const [tool, setTool] = createSignal<MeshEditTool>('select')
  const [selectedVertex, setSelectedVertex] = createSignal<number | null>(null)
  const [draggingVertex, setDraggingVertex] = createSignal<number | null>(null)
  const [draggingTime, setDraggingTime] = createSignal<number | null>(null)
  const [draftPoint, setDraftPoint] = createSignal<VertexPoint | null>(null)
  const [dragStartPoint, setDragStartPoint] = createSignal<VertexPoint | null>(null)
  const [focusedPartId, setFocusedPartId] = createSignal<string | null>(null)
  let activeDocument = untrack(() => props.document)
  const selectedPartIds = createMemo<ReadonlyArray<string>>(() => {
    if (props.selectedPartIds !== undefined) {
      return props.selectedPartIds
    }

    const partId = props.activePartId ?? props.document.parts[0]?.id
    return partId === undefined ? [] : [partId]
  })
  const parts = createMemo<ReadonlyArray<PuppetPart>>(() => {
    const partStates = new Map(
      getScenePartStates(props.document).map((state) => [state.partId, state] as const),
    )

    return selectedPartIds().flatMap((partId) => {
      const state = partStates.get(partId)
      const part = props.document.parts.find((candidate) => candidate.id === partId)
      return state === undefined || state.locked || !state.visible || part === undefined
        ? []
        : [part]
    })
  })
  const part = createMemo(() => {
    const partId =
      props.activePartId ??
      focusedPartId() ??
      (props.selectedPartIds === undefined ? selectedPartIds()[0] : undefined)
    return parts().find((candidate) => candidate.id === partId)
  })
  const vertexRadius = createMemo(() =>
    Math.max(
      MINIMUM_VERTEX_RADIUS,
      Math.max(props.document.viewport.width, props.document.viewport.height) /
        VERTEX_RADIUS_DIVISOR,
    ),
  )
  const partViews = createMemo<ReadonlyArray<MeshPartView>>(() => {
    const activePart = part()
    const activeVertex = selectedVertex()
    const activeDraft = draftPoint()

    return parts().map((candidate) => {
      const vertices = getIndexedVertices({
        draftPoint: candidate.id === activePart?.id ? activeDraft : null,
        mesh: {
          ...candidate.mesh,
          vertices: getPartPreviewVertices(props, candidate),
        },
        selectedVertex: candidate.id === activePart?.id ? activeVertex : null,
      })

      return {
        partId: candidate.id,
        triangles: getMeshViewTriangles({mesh: candidate.mesh, vertices}),
        vertices,
      }
    })
  })
  const vertices = createMemo<ReadonlyArray<IndexedVertex>>(() => {
    const activePart = part()
    return partViews().find((view) => view.partId === activePart?.id)?.vertices ?? []
  })
  const triangles = createMemo<ReadonlyArray<MeshTriangle>>(() => {
    const activePart = part()
    return partViews().find((view) => view.partId === activePart?.id)?.triangles ?? []
  })

  createEffect(() => {
    const {document} = props

    if (document !== activeDocument) {
      activeDocument = document
      setDraggingVertex(null)
      setDraggingTime(null)
      setDraftPoint(null)
      setDragStartPoint(null)
    }
  })

  createEffect(() => {
    if (props.selectedVertexIndex !== undefined) {
      setSelectedVertex(props.selectedVertexIndex)
    }
  })

  createEffect(() => {
    const activePart = part()
    const activeVertex = selectedVertex()
    const missingVertex =
      activePart === undefined ||
      (activeVertex !== null &&
        activeVertex >= activePart.mesh.vertices.length / COORDINATES_PER_VERTEX)

    if (activeVertex !== null && missingVertex) {
      setSelectedVertex(null)
      setDraftPoint(null)
      setDragStartPoint(null)
    }
  })

  return {
    draftPoint,
    draggingTime,
    draggingVertex,
    dragStartPoint,
    part,
    partViews,
    selectedVertex,
    setDraftPoint,
    setDraggingTime,
    setDraggingVertex,
    setDragStartPoint,
    setFocusedPartId,
    setSelectedVertex,
    setTool,
    tool,
    triangles,
    vertexRadius,
    vertices,
  }
}

const resetPointerState = (state: MeshEditorState) => {
  state.setDraggingVertex(null)
  state.setDraggingTime(null)
  state.setDraftPoint(null)
  state.setDragStartPoint(null)
}

export const useMeshEditor = (props: MeshEditorProps): UseMeshEditorResult => {
  const state = createMeshEditorState(props)
  const handleAddVertex = (event: MouseEvent) => {
    const activePart = state.part()
    const {onDocumentChange} = props

    if (
      props.editMode === 'parameter' ||
      state.tool() !== 'add' ||
      activePart === undefined ||
      onDocumentChange === undefined
    ) {
      return
    }

    const pointerPoint = getPointerPoint(
      event,
      event.currentTarget as SVGSVGElement,
      props.document,
    )
    const point = snapPointToEdge({
      maximumDistance: state.vertexRadius() * EDGE_SNAP_RADIUS_MULTIPLIER,
      mesh: activePart.mesh,
      point: pointerPoint,
    })
    const result = addPartVertex({...point, document: props.document, partId: activePart.id})

    if (!result.ok) {
      props.onNotice?.(getEditErrorMessage(result.error.code))
      return
    }

    onDocumentChange(result.document)
    state.setSelectedVertex(result.vertexIndex ?? null)
    props.onVertexSelect?.(result.vertexIndex ?? null)
    state.setTool('select')
    props.onNotice?.('새 정점을 추가하고 주변 메시를 다시 연결했습니다.')
  }

  const handlePointerDown = (event: PointerEvent, partId: string, vertex: IndexedVertex) => {
    if (event.button > 0) {
      return
    }

    const target = event.currentTarget as SVGCircleElement

    event.stopPropagation()
    target.setPointerCapture?.(event.pointerId)
    state.setFocusedPartId(partId)
    state.setSelectedVertex(vertex.index)
    props.onVertexSelect?.(vertex.index)
    state.setDraftPoint({x: vertex.x, y: vertex.y})
    state.setDragStartPoint({x: vertex.x, y: vertex.y})

    if (
      state.tool() === 'select' &&
      props.onDocumentChange !== undefined &&
      canEditSelectedKeyform(props)
    ) {
      state.setDraggingTime(
        props.editMode === 'parameter'
          ? (props.activeKeyformValue ?? null)
          : (props.previewTime ?? null),
      )
      state.setDraggingVertex(vertex.index)
      props.onVertexEditStart?.()
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    const vertexIndex = state.draggingVertex()
    const svgElement = event.currentTarget as SVGSVGElement

    if (vertexIndex !== null) {
      state.setDraftPoint(getPointerPoint(event, svgElement, props.document))
    }
  }

  const handlePointerEnd = () => {
    const activePart = state.part()
    const point = state.draftPoint()
    const startPoint = state.dragStartPoint()
    const keyframeTime = state.draggingTime()
    const vertexIndex = state.draggingVertex()
    const {onDocumentChange} = props

    if (
      vertexIndex === null ||
      activePart === undefined ||
      point === null ||
      onDocumentChange === undefined
    ) {
      return
    }

    const hasMoved = startPoint !== null && (point.x !== startPoint.x || point.y !== startPoint.y)

    resetPointerState(state)

    if (!hasMoved) {
      return
    }

    const result = commitVertexMove({
      ...point,
      document: props.document,
      editMode: props.editMode ?? 'motion',
      keyframeTime,
      parameterId: props.activeParameterId,
      part: activePart,
      vertexIndex,
    })

    if (result.ok) {
      onDocumentChange(result.document)
      props.onNotice?.(getVertexMoveNotice(props.editMode, result.keyframeTime, vertexIndex))
    } else {
      props.onNotice?.(result.message)
    }
  }

  const handleDeleteVertex = () => {
    const activePart = state.part()
    const activeVertex = state.selectedVertex()
    const {onDocumentChange} = props

    if (
      props.editMode === 'parameter' ||
      activePart === undefined ||
      activeVertex === null ||
      onDocumentChange === undefined
    ) {
      return
    }

    const result = deletePartVertex({
      document: props.document,
      partId: activePart.id,
      vertexIndex: activeVertex,
    })

    if (!result.ok) {
      props.onNotice?.(getEditErrorMessage(result.error.code))
      return
    }

    onDocumentChange(result.document)
    state.setSelectedVertex(null)
    props.onVertexSelect?.(null)
    state.setDraftPoint(null)
    state.setDragStartPoint(null)
    props.onNotice?.('선택한 정점을 제거하고 남은 정점으로 메시를 다시 연결했습니다.')
  }

  return {
    canEditTopology: () => props.editMode !== 'parameter' && state.part() !== undefined,
    handleAddVertex,
    handleDeleteVertex,
    handlePointerCancel: () => resetPointerState(state),
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    part: state.part,
    partViews: state.partViews,
    selectAddTool: () => state.setTool('add'),
    selectedVertex: state.selectedVertex,
    selectMoveTool: () => state.setTool('select'),
    tool: state.tool,
    triangles: state.triangles,
    vertexRadius: state.vertexRadius,
    vertices: state.vertices,
  }
}
