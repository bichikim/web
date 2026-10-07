import {type Accessor, createEffect, createMemo, createSignal, on, onCleanup} from 'solid-js'

import type {PuppetParameterValues} from '../deformation'
import type {PuppetDocument, PuppetPart} from '../player/document'
import {applyDeformBrushStroke} from './apply-deform-brush-stroke'
import {canEditSelectedKeyform} from './commit-vertex-move'
import {createMeshSmoother, type MeshSmoother} from './create-mesh-smoother'
import {deformBrushVertices} from './deform-brush-vertices'
import type {VertexPoint} from './edit-document'
import {getMeshViewTriangles, type IndexedVertex} from './internal/mesh-view'
import type {MeshPartView} from './internal/part-views'
import {getEditorPoint, getEditorViewBox} from './internal/viewport'
import type {MeshEditorProps} from './mesh-editor-contract'

const INITIAL_BRUSH_RADIUS = 80
const PERCENT = 100

export type DeformBrushMode = 'move' | 'expand' | 'smooth'

interface DeformBrushContext {
  readonly props: MeshEditorProps
  readonly part: Accessor<PuppetPart | undefined>
  readonly partViews: Accessor<ReadonlyArray<MeshPartView>>
  readonly vertices: Accessor<ReadonlyArray<IndexedVertex>>
}

interface BrushStroke {
  readonly document: PuppetDocument
  readonly element: SVGSVGElement
  readonly part: PuppetPart
  readonly pointerId: number
  readonly source: ReadonlyArray<IndexedVertex>
  readonly start: VertexPoint
  readonly time: number | null
  readonly values: PuppetParameterValues | null
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

const getBrushDraft = (source: readonly IndexedVertex[], values: readonly number[]) =>
  source.map((vertex) => ({
    index: vertex.index,
    x: values[vertex.index * 2]!,
    y: values[vertex.index * 2 + 1]!,
  }))

interface BrushDraftOptions {
  readonly center: VertexPoint
  readonly point: VertexPoint
  readonly hardness: number
  readonly mode: DeformBrushMode
  readonly radius: number
  readonly shift: boolean
  readonly source: ReadonlyArray<IndexedVertex>
  readonly strength: number
  readonly smoother?: MeshSmoother
}

const getDeformBrushDraft = (options: BrushDraftOptions) => {
  const vertices = options.source.flatMap((vertex) => [vertex.x, vertex.y])
  const values =
    options.mode === 'smooth'
      ? options.smoother?.apply({
          center: options.point,
          radius: options.radius,
          strength: options.strength,
          vertices,
        })
      : deformBrushVertices({
          center: options.center,
          delta: {
            x:
              options.shift && options.mode === 'expand'
                ? -Math.abs(options.point.x - options.center.x)
                : options.point.x - options.center.x,
            y: options.point.y - options.center.y,
          },
          hardness: options.hardness,
          mode: options.mode,
          radius: options.radius,
          strength: options.strength,
          vertices,
        })
  return values === undefined ? null : getBrushDraft(options.source, values)
}

const useBrushCancellation = (context: DeformBrushContext, cancel: () => void) => {
  const {props} = context
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel()
    }
  }
  createEffect(
    on(
      () => [
        props.document,
        context.part()?.id,
        props.meshEditing,
        props.editMode,
        props.activeBindingId,
        props.activeKeyformValues,
        props.parameterValues,
        props.parameterValueMap,
        props.previewTime,
      ],
      cancel,
      {defer: true},
    ),
  )

  globalThis.addEventListener('keydown', handleKeyDown)
  globalThis.addEventListener('blur', cancel)
  onCleanup(() => {
    cancel()
    globalThis.removeEventListener('keydown', handleKeyDown)
    globalThis.removeEventListener('blur', cancel)
  })
}

export const useDeformBrush = (context: DeformBrushContext) => {
  const {props} = context
  const smoother = createMemo(() => {
    const part = context.part()
    return part === undefined ? undefined : createMeshSmoother(part.mesh)
  })
  const [brushEnabled, setBrushEnabled] = createSignal(false)
  const [brushMode, setBrushMode] = createSignal<DeformBrushMode>('move')
  const [brushRadius, setBrushRadius] = createSignal(INITIAL_BRUSH_RADIUS)
  const [brushStrength, setBrushStrength] = createSignal(PERCENT)
  const [brushHardness, setBrushHardness] = createSignal(0)
  const [brushCursor, setBrushCursor] = createSignal<VertexPoint | null>(null)
  const [brushDraft, setBrushDraft] = createSignal<ReadonlyArray<IndexedVertex> | null>(null)
  let stroke: BrushStroke | null = null

  const resetBrush = () => {
    const previous = stroke
    stroke = null
    setBrushDraft(null)
    setBrushCursor(null)
    if (previous?.element.hasPointerCapture?.(previous.pointerId)) {
      previous.element.releasePointerCapture(previous.pointerId)
    }
  }

  useBrushCancellation(context, resetBrush)

  const handleBrushPointerDown = (event: PointerEvent) => {
    if (
      !brushEnabled() ||
      stroke !== null ||
      event.button !== 0 ||
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
    stroke = {
      document: props.document,
      element: svg,
      part: activePart,
      pointerId: event.pointerId,
      source: context.vertices(),
      start: getPointerPoint(event, svg, props.document),
      time: props.editMode === 'parameter' ? null : (props.previewTime ?? null),
      values: props.editMode === 'parameter' ? (props.activeKeyformValues ?? null) : null,
    }
    svg.setPointerCapture?.(event.pointerId)
    props.onVertexEditStart?.()
    if (brushMode() === 'smooth') {
      updateBrush(event)
    }
  }

  const updateBrush = (event: PointerEvent) => {
    if (!brushEnabled() || (stroke !== null && stroke.pointerId !== event.pointerId)) {
      return
    }
    const point = getPointerPoint(event, event.currentTarget as SVGSVGElement, props.document)
    setBrushCursor(point)
    if (stroke === null) {
      return
    }
    setBrushDraft(
      getDeformBrushDraft({
        center: stroke.start,
        hardness: brushHardness() / PERCENT,
        mode: brushMode(),
        point,
        radius: brushRadius(),
        shift: event.shiftKey,
        smoother: smoother(),
        source: brushMode() === 'smooth' ? (brushDraft() ?? stroke.source) : stroke.source,
        strength: brushStrength() / PERCENT,
      }),
    )
  }

  const endBrush = (event: PointerEvent) => {
    const current = stroke
    if (current === null || current.pointerId !== event.pointerId) {
      return
    }
    const draft = brushDraft()
    resetBrush()
    if (draft === null || props.onDocumentChange === undefined) {
      return
    }
    const result = applyDeformBrushStroke({
      document: current.document,
      draft,
      part: current.part,
      props,
      source: current.source,
      time: current.time,
      values: current.values,
    })
    if (!result.ok) {
      props.onNotice?.(result.message)
      return
    }
    if (result.document !== current.document) {
      props.onDocumentChange(result.document)
      props.onNotice?.(null)
    }
  }

  return {
    cancel: (event?: PointerEvent) => {
      if (event === undefined || stroke === null || stroke.pointerId === event.pointerId) {
        resetBrush()
      }
    },
    canSmooth: () => smoother()?.available ?? false,
    cursor: brushCursor,
    displayedViews: createMemo(() => getBrushViews(context, brushDraft())),
    enabled: brushEnabled,
    handlePointerDown: handleBrushPointerDown,
    handlePointerEnd: endBrush,
    handlePointerMove: updateBrush,
    hardness: brushHardness,
    mode: brushMode,
    radius: brushRadius,
    setEnabled: (value: boolean) => {
      resetBrush()
      setBrushEnabled(value)
    },
    setHardness: setBrushHardness,
    setMode: (mode: DeformBrushMode) => {
      resetBrush()
      setBrushMode(mode)
      setBrushEnabled(true)
    },
    setRadius: setBrushRadius,
    setStrength: setBrushStrength,
    strength: brushStrength,
  }
}
