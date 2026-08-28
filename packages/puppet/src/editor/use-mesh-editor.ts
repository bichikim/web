import {type Accessor, createEffect, createMemo, createSignal, type Setter} from 'solid-js'

import type {PuppetDocument, PuppetPart} from '../player/document'
import {addPartVertex, deletePartVertex, movePartVertex, type VertexPoint} from './edit-document'
import {
  getIndexedVertices,
  getMeshViewTriangles,
  type IndexedVertex,
  type MeshTriangle,
  snapPointToEdge,
} from './internal/mesh-view'
import {getEditErrorMessage} from './internal/notices'
import {getEditorPoint, getEditorViewBox} from './internal/viewport'
import type {MeshEditorProps} from './mesh-editor-contract'

export type {IndexedVertex, MeshTriangle} from './internal/mesh-view'

export type MeshEditTool = 'add' | 'select'

export interface UseMeshEditorResult {
  readonly handleAddVertex: (event: MouseEvent) => void
  readonly handleDeleteVertex: () => void
  readonly handlePointerCancel: () => void
  readonly handlePointerDown: (event: PointerEvent, vertex: IndexedVertex) => void
  readonly handlePointerEnd: () => void
  readonly handlePointerMove: (event: PointerEvent) => void
  readonly part: Accessor<PuppetPart | undefined>
  readonly selectAddTool: () => void
  readonly selectMoveTool: () => void
  readonly selectedVertex: Accessor<number | null>
  readonly tool: Accessor<MeshEditTool>
  readonly triangles: Accessor<ReadonlyArray<MeshTriangle>>
  readonly vertexRadius: Accessor<number>
  readonly vertices: Accessor<ReadonlyArray<IndexedVertex>>
}

interface MeshEditorState {
  readonly draftPoint: Accessor<VertexPoint | null>
  readonly draggingVertex: Accessor<number | null>
  readonly part: Accessor<PuppetPart | undefined>
  readonly selectedVertex: Accessor<number | null>
  readonly setDraftPoint: Setter<VertexPoint | null>
  readonly setDraggingVertex: Setter<number | null>
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

const createMeshEditorState = (props: MeshEditorProps): MeshEditorState => {
  const [tool, setTool] = createSignal<MeshEditTool>('select')
  const [selectedVertex, setSelectedVertex] = createSignal<number | null>(null)
  const [draggingVertex, setDraggingVertex] = createSignal<number | null>(null)
  const [draftPoint, setDraftPoint] = createSignal<VertexPoint | null>(null)
  const part = createMemo(() =>
    props.activePartId === undefined
      ? props.document.parts[0]
      : props.document.parts.find((candidate) => candidate.id === props.activePartId),
  )
  const vertexRadius = createMemo(() =>
    Math.max(
      MINIMUM_VERTEX_RADIUS,
      Math.max(props.document.viewport.width, props.document.viewport.height) /
        VERTEX_RADIUS_DIVISOR,
    ),
  )
  const vertices = createMemo<ReadonlyArray<IndexedVertex>>(() => {
    const activePart = part()
    const activeVertex = selectedVertex()
    const activeDraft = draftPoint()

    if (activePart === undefined) {
      return []
    }

    return getIndexedVertices({
      draftPoint: activeDraft,
      mesh: activePart.mesh,
      selectedVertex: activeVertex,
    })
  })
  const triangles = createMemo<ReadonlyArray<MeshTriangle>>(() => {
    const activePart = part()
    const activeVertices = vertices()

    if (activePart === undefined) {
      return []
    }

    return getMeshViewTriangles({mesh: activePart.mesh, vertices: activeVertices})
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
    }
  })

  return {
    draftPoint,
    draggingVertex,
    part,
    selectedVertex,
    setDraftPoint,
    setDraggingVertex,
    setSelectedVertex,
    setTool,
    tool,
    triangles,
    vertexRadius,
    vertices,
  }
}

export const useMeshEditor = (props: MeshEditorProps): UseMeshEditorResult => {
  const state = createMeshEditorState(props)

  const handleAddVertex = (event: MouseEvent) => {
    const activePart = state.part()
    const {onDocumentChange} = props

    if (state.tool() !== 'add' || activePart === undefined || onDocumentChange === undefined) {
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
    state.setTool('select')
    props.onNotice?.('새 정점을 추가하고 주변 메시를 다시 연결했습니다.')
  }

  const handlePointerDown = (event: PointerEvent, vertex: IndexedVertex) => {
    const target = event.currentTarget as SVGCircleElement

    event.stopPropagation()
    target.setPointerCapture?.(event.pointerId)
    state.setSelectedVertex(vertex.index)
    state.setDraftPoint({x: vertex.x, y: vertex.y})

    if (state.tool() === 'select' && props.onDocumentChange !== undefined) {
      state.setDraggingVertex(vertex.index)
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    const vertexIndex = state.draggingVertex()
    const svgElement = event.currentTarget as SVGSVGElement

    if (vertexIndex !== null) {
      state.setDraftPoint(getPointerPoint(event, svgElement, props.document))
    }
  }

  const handlePointerCancel = () => {
    state.setDraggingVertex(null)
    state.setDraftPoint(null)
  }

  const handlePointerEnd = () => {
    const activePart = state.part()
    const point = state.draftPoint()
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

    const result = movePartVertex({
      ...point,
      document: props.document,
      partId: activePart.id,
      vertexIndex,
    })

    state.setDraggingVertex(null)
    state.setDraftPoint(null)

    if (result.ok) {
      onDocumentChange(result.document)
      props.onNotice?.(`정점 ${vertexIndex + 1} 위치를 변경했습니다.`)
    } else {
      props.onNotice?.(getEditErrorMessage(result.error.code))
    }
  }

  const handleDeleteVertex = () => {
    const activePart = state.part()
    const activeVertex = state.selectedVertex()
    const {onDocumentChange} = props

    if (activePart === undefined || activeVertex === null || onDocumentChange === undefined) {
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
    state.setDraftPoint(null)
    props.onNotice?.('선택한 정점을 제거하고 남은 정점으로 메시를 다시 연결했습니다.')
  }

  return {
    handleAddVertex,
    handleDeleteVertex,
    handlePointerCancel,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    part: state.part,
    selectAddTool: () => state.setTool('add'),
    selectedVertex: state.selectedVertex,
    selectMoveTool: () => state.setTool('select'),
    tool: state.tool,
    triangles: state.triangles,
    vertexRadius: state.vertexRadius,
    vertices: state.vertices,
  }
}
