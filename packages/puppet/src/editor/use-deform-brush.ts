import {type Accessor, createEffect, createMemo, createSignal, untrack} from 'solid-js'

import type {PuppetParameterValues} from '../deformation'
import type {PuppetDocument, PuppetPart} from '../player/document'
import {applyDeformBrushStroke} from './apply-deform-brush-stroke'
import {canEditSelectedKeyform} from './commit-vertex-move'
import {deformBrushVertices} from './deform-brush-vertices'
import type {VertexPoint} from './edit-document'
import {getMeshViewTriangles, type IndexedVertex} from './internal/mesh-view'
import type {MeshPartView} from './internal/part-views'
import {getEditorPoint, getEditorViewBox} from './internal/viewport'
import type {MeshEditorProps} from './mesh-editor-contract'

const INITIAL_BRUSH_RADIUS = 80
const PERCENT = 100

interface DeformBrushContext {
  readonly props: MeshEditorProps
  readonly part: Accessor<PuppetPart | undefined>
  readonly partViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly vertices: Accessor<ReadonlyArray<IndexedVertex>>
}

const getPointerPoint = (
  event: PointerEvent,
  svg: SVGSVGElement,
  document: PuppetDocument,
): VertexPoint =>
  getEditorPoint({
    bounds: svg.getBoundingClientRect(),
    clientPoint: {x: event.clientX, y: event.clientY},
    viewBox: getEditorViewBox(document),
  })

const getBrushViews = (
  context: DeformBrushContext,
  draft: ReadonlyArray<IndexedVertex> | null,
): ReadonlyArray<MeshPartView> => {
  const activePart = context.part()
  if (draft === null || activePart === undefined) {
    return context.partViews()
  }
  return context.partViews().map((view) =>
    view.partId === activePart.id
      ? {
          ...view,
          boundaryLoops:
            activePart.mesh.boundaryLoops?.map((loop) =>
              loop.flatMap((index) => {
                const vertex = draft[index]
                return vertex === undefined ? [] : [vertex]
              }),
            ) ?? [],
          triangles: getMeshViewTriangles({mesh: activePart.mesh, vertices: draft}),
          vertices: draft,
        }
      : view,
  )
}

export const useDeformBrush = (context: DeformBrushContext) => {
  const {props} = context
  const [brushEnabled, setBrushEnabled] = createSignal(false)
  const [brushRadius, setBrushRadius] = createSignal(INITIAL_BRUSH_RADIUS)
  const [brushStrength, setBrushStrength] = createSignal(PERCENT)
  const [brushHardness, setBrushHardness] = createSignal(0)
  const [brushCursor, setBrushCursor] = createSignal<VertexPoint | null>(null)
  const [brushDraft, setBrushDraft] = createSignal<ReadonlyArray<IndexedVertex> | null>(null)
  let brushStart: VertexPoint | null = null
  let brushSource: ReadonlyArray<IndexedVertex> = []
  let brushPart: PuppetPart | undefined
  let brushDocument: PuppetDocument | undefined
  let brushTime: number | null = null
  let brushValues: PuppetParameterValues | null = null
  let activeDocument = untrack(() => props.document)
  let activePartId = untrack(() => props.activePartId)
  let activeMeshEditing = untrack(() => props.meshEditing)

  const resetBrush = () => {
    brushStart = null
    brushSource = []
    brushPart = undefined
    brushDocument = undefined
    brushTime = null
    brushValues = null
    setBrushDraft(null)
  }

  createEffect(() => {
    const {document} = props
    const partId = props.activePartId
    const {meshEditing} = props
    if (
      document !== activeDocument ||
      partId !== activePartId ||
      meshEditing !== activeMeshEditing
    ) {
      resetBrush()
      activeDocument = document
      activePartId = partId
      activeMeshEditing = meshEditing
    }
  })

  const handleBrushPointerDown = (event: PointerEvent) => {
    if (
      !brushEnabled() ||
      event.button > 0 ||
      props.onDocumentChange === undefined ||
      !canEditSelectedKeyform(props)
    ) {
      return
    }
    const activePart = context.part()
    if (activePart === undefined) {
      return
    }
    event.preventDefault()
    const svg = event.currentTarget as SVGSVGElement
    svg.focus()
    svg.setPointerCapture?.(event.pointerId)
    brushStart = getPointerPoint(event, svg, props.document)
    brushSource = context.vertices()
    brushPart = activePart
    brushDocument = props.document
    brushTime = props.editMode === 'parameter' ? null : (props.previewTime ?? null)
    brushValues = props.editMode === 'parameter' ? (props.activeKeyformValues ?? null) : null
    props.onVertexEditStart?.()
  }

  const updateBrush = (event: PointerEvent) => {
    if (!brushEnabled()) {
      return
    }
    const point = getPointerPoint(event, event.currentTarget as SVGSVGElement, props.document)
    setBrushCursor(point)
    if (brushStart === null) {
      return
    }
    const values = deformBrushVertices({
      center: brushStart,
      delta: {x: point.x - brushStart.x, y: point.y - brushStart.y},
      hardness: brushHardness() / PERCENT,
      radius: brushRadius(),
      strength: brushStrength() / PERCENT,
      vertices: brushSource.flatMap((vertex) => [vertex.x, vertex.y]),
    })
    setBrushDraft(
      brushSource.map((vertex) => ({
        index: vertex.index,
        x: values[vertex.index * 2]!,
        y: values[vertex.index * 2 + 1]!,
      })),
    )
  }

  const endBrush = () => {
    const draft = brushDraft()
    const activePart = brushPart
    const original = brushDocument
    const time = brushTime
    const values = brushValues
    const source = brushSource
    resetBrush()
    if (
      draft === null ||
      activePart === undefined ||
      original === undefined ||
      props.onDocumentChange === undefined
    ) {
      return
    }
    const result = applyDeformBrushStroke({
      document: original,
      draft,
      part: activePart,
      props,
      source,
      time,
      values,
    })
    if (!result.ok) {
      props.onNotice?.(result.message)
      return
    }
    if (result.document !== original) {
      props.onDocumentChange(result.document)
      props.onNotice?.('변형 브러시 획을 적용했습니다.')
    }
  }

  const displayedViews = createMemo(() => getBrushViews(context, brushDraft()))

  return {
    cancel: resetBrush,
    cursor: brushCursor,
    displayedViews,
    enabled: brushEnabled,
    handlePointerDown: handleBrushPointerDown,
    handlePointerEnd: endBrush,
    handlePointerMove: updateBrush,
    hardness: brushHardness,
    radius: brushRadius,
    setEnabled: (value: boolean) => {
      resetBrush()
      setBrushEnabled(value)
    },
    setHardness: setBrushHardness,
    setRadius: setBrushRadius,
    setStrength: setBrushStrength,
    strength: brushStrength,
  }
}
