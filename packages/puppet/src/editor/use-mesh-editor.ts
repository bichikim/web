import {type Accessor, createEffect, createMemo, createSignal, type Setter} from 'solid-js'

import {getEdgeKey, getMeshTriangles, getMeshVertex, getTriangleEdges} from '../mesh'
import type {PuppetDocument, PuppetMesh, PuppetPart} from '../player/document'
import {
  addPartVertex,
  deletePartVertex,
  type EditDocumentErrorCode,
  movePartVertex,
  type VertexPoint,
} from './edit-document'
import type {MeshEditorProps} from './mesh-editor-contract'
import {getEditorViewBox} from './internal/viewport'

export interface IndexedVertex extends VertexPoint {
  readonly index: number
}

export interface MeshTriangle {
  readonly first: VertexPoint
  readonly index: number
  readonly second: VertexPoint
  readonly third: VertexPoint
}

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
const INDICES_PER_TRIANGLE = 3
const VERTEX_RADIUS_DIVISOR = 150
const MINIMUM_VERTEX_RADIUS = 3
const EDGE_SNAP_RADIUS_MULTIPLIER = 2

const getVertex = (mesh: PuppetMesh, vertexIndex: number): VertexPoint | undefined => {
  const x = mesh.vertices[vertexIndex * COORDINATES_PER_VERTEX]
  const y = mesh.vertices[vertexIndex * COORDINATES_PER_VERTEX + 1]

  return x === undefined || y === undefined ? undefined : {x, y}
}

const projectPointToSegment = (
  point: VertexPoint,
  first: VertexPoint,
  second: VertexPoint,
): VertexPoint => {
  const horizontalDistance = second.x - first.x
  const verticalDistance = second.y - first.y
  const lengthSquared = horizontalDistance ** 2 + verticalDistance ** 2

  if (lengthSquared === 0) {
    return first
  }

  const progress = Math.max(
    0,
    Math.min(
      1,
      ((point.x - first.x) * horizontalDistance + (point.y - first.y) * verticalDistance) /
        lengthSquared,
    ),
  )

  return {
    x: first.x + horizontalDistance * progress,
    y: first.y + verticalDistance * progress,
  }
}

const snapPointToEdge = (
  mesh: PuppetMesh,
  point: VertexPoint,
  maximumDistance: number,
): VertexPoint => {
  const visitedEdges = new Set<string>()
  let closestPoint = point
  let closestDistanceSquared = maximumDistance ** 2

  for (const triangle of getMeshTriangles(mesh)) {
    for (const edge of getTriangleEdges(triangle)) {
      const key = getEdgeKey(edge.firstIndex, edge.secondIndex)
      const first = getMeshVertex(mesh, edge.firstIndex)
      const second = getMeshVertex(mesh, edge.secondIndex)

      if (!visitedEdges.has(key) && first !== undefined && second !== undefined) {
        const projectedPoint = projectPointToSegment(point, first, second)
        const horizontalDistance = point.x - projectedPoint.x
        const verticalDistance = point.y - projectedPoint.y
        const distanceSquared = horizontalDistance ** 2 + verticalDistance ** 2

        if (distanceSquared <= closestDistanceSquared) {
          closestPoint = projectedPoint
          closestDistanceSquared = distanceSquared
        }
      }

      visitedEdges.add(key)
    }
  }

  return closestPoint
}

const getEditErrorMessage = (code: EditDocumentErrorCode) => {
  switch (code) {
    case 'duplicate-vertex':
      return '같은 위치에 이미 정점이 있습니다.'
    case 'edge-blocked':
      return '현재 메시 구조에서는 두 정점을 연결할 수 없습니다.'
    case 'edge-exists':
      return '두 정점은 이미 간선으로 연결돼 있습니다.'
    case 'invalid-edge':
      return '선택한 간선을 편집할 수 없습니다.'
    case 'invalid-mesh':
      return '작업 결과가 올바른 메시를 만들지 못해 변경하지 않았습니다.'
    case 'invalid-position':
      return '정점 위치가 올바르지 않습니다.'
    case 'invalid-vertex':
      return '선택한 정점을 편집할 수 없습니다.'
    case 'inverted-triangle':
      return '삼각형이 뒤집히거나 사라지는 위치로는 이동할 수 없습니다.'
    case 'minimum-vertex-count':
      return '메시는 최소 4개의 정점이 필요합니다.'
    case 'missing-part':
      return '편집할 이미지 파트를 찾지 못했습니다.'
    case 'outside-mesh':
      return '그려진 메시 영역 안에서만 정점을 추가할 수 있습니다.'
    case 'would-remove-mesh':
      return '마지막 삼각형을 제거하는 정점은 삭제할 수 없습니다.'
    default: {
      const exhaustiveCode: never = code
      return exhaustiveCode
    }
  }
}

const getPointerPoint = (
  event: PointerEvent | MouseEvent,
  svgElement: SVGSVGElement,
  document: PuppetDocument,
): VertexPoint => {
  const bounds = svgElement.getBoundingClientRect()
  const viewBox = getEditorViewBox(document)
  const scale = Math.min(bounds.width / viewBox.width, bounds.height / viewBox.height)
  const horizontalOffset = (bounds.width - viewBox.width * scale) / 2
  const verticalOffset = (bounds.height - viewBox.height * scale) / 2

  return {
    x: (event.clientX - bounds.left - horizontalOffset) / scale + viewBox.x,
    y: (event.clientY - bounds.top - verticalOffset) / scale + viewBox.y,
  }
}

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

    const vertexCount = activePart.mesh.vertices.length / COORDINATES_PER_VERTEX

    return Array.from({length: vertexCount}, (_, index) => ({
      index,
      ...(activeVertex === index && activeDraft !== null
        ? activeDraft
        : (getVertex(activePart.mesh, index) ?? {x: 0, y: 0})),
    }))
  })
  const triangles = createMemo<ReadonlyArray<MeshTriangle>>(() => {
    const activePart = part()
    const activeVertices = vertices()

    if (activePart === undefined) {
      return []
    }

    const result: MeshTriangle[] = []

    for (let index = 0; index < activePart.mesh.indices.length; index += INDICES_PER_TRIANGLE) {
      const firstIndex = activePart.mesh.indices[index]
      const secondIndex = activePart.mesh.indices[index + 1]
      const thirdIndex = activePart.mesh.indices[index + 2]
      const first = firstIndex === undefined ? undefined : activeVertices[firstIndex]
      const second = secondIndex === undefined ? undefined : activeVertices[secondIndex]
      const third = thirdIndex === undefined ? undefined : activeVertices[thirdIndex]

      if (first !== undefined && second !== undefined && third !== undefined) {
        result.push({first, index: index / INDICES_PER_TRIANGLE, second, third})
      }
    }

    return result
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
    const point = snapPointToEdge(
      activePart.mesh,
      pointerPoint,
      state.vertexRadius() * EDGE_SNAP_RADIUS_MULTIPLIER,
    )
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
