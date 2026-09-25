import {moveMeshVertex} from './move-mesh-vertex'
import {canEditSelectedKeyform, commitVertexMove, getVertexMoveNotice} from './commit-vertex-move'
import {useDeformBrush} from './use-deform-brush'
import {type Accessor, createEffect, createMemo, createSignal, type Setter, untrack} from 'solid-js'

import type {PuppetParameterValues} from '../deformation'
import type {PuppetDocument, PuppetPart} from '../player/document'
import {getScenePartStates} from '../player/scene'
import {addPartVertex, deletePartVertex, type VertexPoint} from './edit-document'
import {type IndexedVertex, type MeshTriangle, snapPointToEdge} from './internal/mesh-view'
import {getDeformerPreviewDocument} from './internal/mesh-preview'
import {getEditErrorMessage} from './internal/notices'
import {createPartViews, type MeshPartView} from './internal/part-views'
import {unapplySceneDeformersPoint} from './internal/scene-deformation'
import {getEditorPoint, getEditorViewBox} from './internal/viewport'
import type {MeshEditorProps} from './mesh-editor-contract'

export type {IndexedVertex, MeshTriangle} from './internal/mesh-view'
export type {MeshPartView} from './internal/part-views'

export interface UseMeshEditorResult {
  readonly brushEnabled: Accessor<boolean>
  readonly brushRadius: Accessor<number>
  readonly brushStrength: Accessor<number>
  readonly brushHardness: Accessor<number>
  readonly brushCursor: Accessor<VertexPoint | null>
  readonly setBrushEnabled: (value: boolean) => void
  readonly setBrushRadius: Setter<number>
  readonly setBrushStrength: Setter<number>
  readonly setBrushHardness: Setter<number>
  readonly handleBrushPointerDown: (event: PointerEvent) => void
  readonly canEditTopology: Accessor<boolean>
  readonly handleAddVertex: (event: MouseEvent) => void
  readonly handleCanvasClick: (event: MouseEvent) => void
  readonly handleKeyDown: (event: KeyboardEvent) => void
  readonly handleDeleteVertex: () => void
  readonly handlePointerCancel: () => void
  readonly handlePointerDown: (event: PointerEvent, partId: string, vertex: IndexedVertex) => void
  readonly handlePointerEnd: () => void
  readonly handlePointerMove: (event: PointerEvent) => void
  readonly clippedPartViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly part: Accessor<PuppetPart | undefined>
  readonly partViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly selectedVertex: Accessor<number | null>
  readonly triangles: Accessor<ReadonlyArray<MeshTriangle>>
  readonly vertexRadius: Accessor<number>
  readonly vertices: Accessor<ReadonlyArray<IndexedVertex>>
}

interface MeshEditorState {
  readonly draftPoint: Accessor<VertexPoint | null>
  readonly dragStartPoint: Accessor<VertexPoint | null>
  readonly draggingTime: Accessor<number | null>
  readonly draggingValues: Accessor<PuppetParameterValues | null>
  readonly draggingVertex: Accessor<number | null>
  readonly clippedPartViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly part: Accessor<PuppetPart | undefined>
  readonly partViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly selectedVertex: Accessor<number | null>
  readonly setDraftPoint: Setter<VertexPoint | null>
  readonly setDragStartPoint: Setter<VertexPoint | null>
  readonly setDraggingTime: Setter<number | null>
  readonly setDraggingValues: Setter<PuppetParameterValues | null>
  readonly setDraggingVertex: Setter<number | null>
  readonly setFocusedPartId: Setter<string | null>
  readonly setSelectedVertex: Setter<number | null>
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
  const [selectedVertex, setSelectedVertex] = createSignal<number | null>(null)
  const [draggingVertex, setDraggingVertex] = createSignal<number | null>(null)
  const [draggingTime, setDraggingTime] = createSignal<number | null>(null)
  const [draggingValues, setDraggingValues] = createSignal<PuppetParameterValues | null>(null)
  const [draftPoint, setDraftPoint] = createSignal<VertexPoint | null>(null)
  const [dragStartPoint, setDragStartPoint] = createSignal<VertexPoint | null>(null)
  const [focusedPartId, setFocusedPartId] = createSignal<string | null>(null)
  let activeDocument = untrack(() => props.document)
  let activeEditing = untrack(() => props.meshEditing)
  let activePartId = untrack(() => props.activePartId)
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
    return createPartViews({
      activePartId: activePart?.id,
      candidates: parts(),
      draftPoint: draftPoint(),
      props,
      selectedVertex: selectedVertex(),
    })
  })
  const clippedPartViews = createMemo<ReadonlyArray<MeshPartView>>(() => {
    const maskPartId = part()?.id
    return createPartViews({
      candidates: props.document.parts.filter(
        (candidate) =>
          maskPartId !== undefined && candidate.properties?.clippingMaskIds?.includes(maskPartId),
      ),
      draftPoint: null,
      props,
      selectedVertex: null,
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
    const {activePartId: nextActivePartId, document, meshEditing} = props

    if (
      document !== activeDocument ||
      meshEditing !== activeEditing ||
      nextActivePartId !== activePartId
    ) {
      activeDocument = document
      activeEditing = meshEditing
      activePartId = nextActivePartId
      setDraggingVertex(null)
      setDraggingTime(null)
      setDraggingValues(null)
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
    clippedPartViews,
    draftPoint,
    draggingTime,
    draggingValues,
    draggingVertex,
    dragStartPoint,
    part,
    partViews,
    selectedVertex,
    setDraftPoint,
    setDraggingTime,
    setDraggingValues,
    setDraggingVertex,
    setDragStartPoint,
    setFocusedPartId,
    setSelectedVertex,
    triangles,
    vertexRadius,
    vertices,
  }
}

const resetPointerState = (state: MeshEditorState) => {
  state.setDraggingVertex(null)
  state.setDraggingTime(null)
  state.setDraggingValues(null)
  state.setDraftPoint(null)
  state.setDragStartPoint(null)
}

const updatePointerDraft = (
  state: MeshEditorState,
  document: PuppetDocument,
  event: PointerEvent,
) => {
  if (state.draggingVertex() !== null) {
    state.setDraftPoint(getPointerPoint(event, event.currentTarget as SVGSVGElement, document))
  }
}

const canEditMeshTopology = (props: MeshEditorProps, state: MeshEditorState) =>
  !props.meshEditing &&
  props.editMode !== 'motion' &&
  props.onDocumentChange !== undefined &&
  state.part() !== undefined

const createAddVertexHandler =
  (props: MeshEditorProps, state: MeshEditorState) => (event: MouseEvent) => {
    const activePart = state.part()
    const {onDocumentChange} = props
    if (
      props.meshEditing ||
      props.editMode === 'motion' ||
      (event.target instanceof Element && event.target.closest('circle') !== null) ||
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
    const localPoint = unapplySceneDeformersPoint({
      document: getDeformerPreviewDocument(props),
      partId: activePart.id,
      point,
    })
    const result = addPartVertex({...localPoint, document: props.document, partId: activePart.id})
    if (!result.ok) {
      props.onNotice?.(getEditErrorMessage(result.error.code))
      return
    }

    onDocumentChange(result.document)
    state.setSelectedVertex(result.vertexIndex ?? null)
    props.onVertexSelect?.(result.vertexIndex ?? null)
    props.onNotice?.('새 정점을 추가하고 주변 메시를 다시 연결했습니다.')
  }

const createDeleteVertexHandler = (props: MeshEditorProps, state: MeshEditorState) => () => {
  const activePart = state.part()
  const activeVertex = state.selectedVertex()
  const {onDocumentChange} = props
  if (
    props.editMode === 'motion' ||
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

const createPointerEndHandler = (props: MeshEditorProps, state: MeshEditorState) => () => {
  const activePart = state.part()
  const point = state.draftPoint()
  const startPoint = state.dragStartPoint()
  const keyframeTime = state.draggingTime()
  const parameterValues = state.draggingValues()
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

  if (props.meshEditing) {
    const result = moveMeshVertex({
      document: props.document,
      partId: activePart.id,
      vertexIndex,
      ...point,
    })
    if (result.ok) {
      onDocumentChange(result.document)
    } else {
      props.onNotice?.(result.message)
    }
    return
  }

  const localPoint = unapplySceneDeformersPoint({
    document: getDeformerPreviewDocument(props),
    partId: activePart.id,
    point,
    vertexIndex,
  })
  const result = commitVertexMove({
    ...localPoint,
    bindingId: props.activeBindingId,
    document: props.document,
    editMode: props.editMode ?? 'motion',
    keyframeTime,
    parameterValueMap: props.parameterValueMap,
    parameterValues,
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

export const useMeshEditor = (props: MeshEditorProps): UseMeshEditorResult => {
  const state = createMeshEditorState(props)
  const handleAddVertex = createAddVertexHandler(props, state)
  const brush = useDeformBrush({
    part: state.part,
    partViews: state.partViews,
    props,
    vertices: state.vertices,
  })

  const handlePointerDown = (event: PointerEvent, partId: string, vertex: IndexedVertex) => {
    if (event.button > 0) {
      return
    }

    const target = event.currentTarget as SVGCircleElement

    event.stopPropagation()
    target.ownerSVGElement?.focus()
    target.setPointerCapture?.(event.pointerId)
    state.setFocusedPartId(partId)
    state.setSelectedVertex(vertex.index)
    props.onVertexSelect?.(vertex.index)
    state.setDraftPoint({x: vertex.x, y: vertex.y})
    state.setDragStartPoint({x: vertex.x, y: vertex.y})

    if (props.onDocumentChange !== undefined && canEditSelectedKeyform(props)) {
      state.setDraggingTime(props.editMode === 'parameter' ? null : (props.previewTime ?? null))
      state.setDraggingValues(
        props.editMode === 'parameter' ? (props.activeKeyformValues ?? null) : null,
      )
      state.setDraggingVertex(vertex.index)
      props.onVertexEditStart?.()
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (brush.enabled()) {
      brush.handlePointerMove(event)
      return
    }
    updatePointerDraft(state, props.document, event)
  }

  const handlePointerEnd = createPointerEndHandler(props, state)

  const handleDeleteVertex = createDeleteVertexHandler(props, state)

  return {
    brushCursor: brush.cursor,
    brushEnabled: brush.enabled,
    brushHardness: brush.hardness,
    brushRadius: brush.radius,
    brushStrength: brush.strength,
    canEditTopology: () => canEditMeshTopology(props, state),
    clippedPartViews: state.clippedPartViews,
    handleAddVertex,
    handleBrushPointerDown: brush.handlePointerDown,
    handleCanvasClick: (event) => {
      const svg = event.currentTarget as SVGSVGElement
      if (event.target instanceof Element && event.target.closest('circle') !== null) {
        return
      }
      svg.focus()
      state.setSelectedVertex(null)
      props.onVertexSelect?.(null)
    },
    handleDeleteVertex,
    handleKeyDown: (event) => {
      if (
        event.target !== event.currentTarget ||
        event.isComposing ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        (event.key !== 'Backspace' && event.key !== 'Delete') ||
        !canEditMeshTopology(props, state) ||
        state.selectedVertex() === null
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      handleDeleteVertex()
    },
    handlePointerCancel: () => {
      resetPointerState(state)
      brush.cancel()
    },
    handlePointerDown,
    handlePointerEnd: () => {
      if (brush.enabled()) {
        brush.handlePointerEnd()
      } else {
        handlePointerEnd()
      }
    },
    handlePointerMove,
    part: state.part,
    partViews: brush.displayedViews,
    selectedVertex: state.selectedVertex,
    setBrushEnabled: brush.setEnabled,
    setBrushHardness: brush.setHardness,
    setBrushRadius: brush.setRadius,
    setBrushStrength: brush.setStrength,
    triangles: state.triangles,
    vertexRadius: state.vertexRadius,
    vertices: state.vertices,
  }
}
