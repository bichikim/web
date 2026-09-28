import {For, Show} from 'solid-js'
import type {PuppetParameterValues} from '../../deformation'
import type {PuppetDocument, PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {resolveSpatialRotation} from '../../player/internal/spatial-part'
import {isSceneNodeLocked} from './scene-graph'
import {applySceneNodeAncestorsPoint, unapplySceneNodeAncestorsPoint} from './scene-deformation'
import {setSpatialDeformerTransform} from './set-spatial-deformer-transform'
import {getEditorPoint, getEditorViewBox} from './viewport'

interface SpatialDeformerEditorProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly node: PuppetSceneDeformerNode
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly previewDocument?: PuppetDocument
  readonly targetNodeIds?: ReadonlyArray<string>
}

const HALF_ROTATION = 180
const KEYBOARD_STEP = 5
const AXIS_DEPTH_RATIO = 3
const MIN_MOVE_HANDLE_LENGTH = 24
const MAX_MOVE_HANDLE_LENGTH = 90
const MOVE_HANDLE_LENGTH_RATIO = 0.65
const DIAGONAL_COMPONENT = Math.SQRT1_2
const axes = ['X', 'Y', 'Z'] as const

type SpatialDrag =
  | {
      readonly kind: 'rotation'
      readonly axis: number
      readonly pointerId: number
      readonly initial: number
      readonly x: number
      readonly y: number
    }
  | {
      readonly kind: 'translation'
      readonly axis: number
      readonly pointerId: number
      readonly initial: number
      readonly point: PuppetPoint
    }

// eslint-disable-next-line max-lines-per-function -- Keep the surface preview and three axis handlers together.
export const SpatialDeformerEditor = (props: SpatialDeformerEditorProps) => {
  let drag: SpatialDrag | undefined
  let root: SVGSVGElement | undefined
  const viewBox = () => getEditorViewBox(props.previewDocument ?? props.document)
  const origin = () =>
    props.node.spatialOrigin ?? [
      props.node.bounds.x + props.node.bounds.width / 2,
      props.node.bounds.y + props.node.bounds.height / 2,
      0,
    ]
  const radius = () => Math.min(props.node.bounds.width, props.node.bounds.height) / 2
  const moveHandleLength = () =>
    Math.max(
      MIN_MOVE_HANDLE_LENGTH,
      Math.min(radius() * MOVE_HANDLE_LENGTH_RATIO, MAX_MOVE_HANDLE_LENGTH),
    )
  const transformPoint = (x: number, y: number) =>
    applySceneNodeAncestorsPoint({
      document: props.previewDocument ?? props.document,
      nodeId: props.node.id,
      point: {x, y},
    })
  const screenOrigin = () => {
    const [x, y] = origin()
    const [translationX, translationY] = props.node.spatialTranslation ?? [0, 0, 0]
    return transformPoint(x + translationX, y + translationY)
  }
  const moveHandle = (axis: number) => {
    const center = screenOrigin()
    const length = moveHandleLength()
    const direction =
      axis === 0 ? [1, 0] : axis === 1 ? [0, -1] : [-DIAGONAL_COMPONENT, DIAGONAL_COMPONENT]
    return {x: center.x + direction[0]! * length, y: center.y + direction[1]! * length}
  }
  const pointerPoint = (event: PointerEvent) => {
    const bounds = root?.getBoundingClientRect()
    return bounds === undefined
      ? undefined
      : unapplySceneNodeAncestorsPoint({
          document: props.previewDocument ?? props.document,
          nodeId: props.node.id,
          point: getEditorPoint({
            bounds,
            clientPoint: {x: event.clientX, y: event.clientY},
            viewBox: viewBox(),
          }),
        })
  }
  const editable = () => !isSceneNodeLocked(props.document, props.node.id)
  const rotation = () =>
    resolveSpatialRotation({
      document: props.previewDocument ?? props.document,
      parameterIds: props.node.spatialRotationParameterIds,
      rotation: props.node.spatialRotation,
    })
  const setRotation = (axis: number, value: number) => {
    const next: [number, number, number] = [...(props.node.spatialRotation ?? [0, 0, 0])]
    next[axis] = value
    const document = setSpatialDeformerTransform({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      document: props.document,
      editMode: props.editMode,
      nodeId: props.node.id,
      previewDeformer: props.node,
      property: 'spatialRotation',
      targetNodeIds: props.targetNodeIds,
      value: next,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const setTranslation = (axis: number, value: number) => {
    const next: [number, number, number] = [...(props.node.spatialTranslation ?? [0, 0, 0])]
    next[axis] = value
    const document = setSpatialDeformerTransform({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      document: props.document,
      editMode: props.editMode,
      nodeId: props.node.id,
      previewDeformer: props.node,
      property: 'spatialTranslation',
      targetNodeIds: props.targetNodeIds,
      value: next,
    })
    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const startRotationDrag = (event: PointerEvent, axis: number) => {
    if (!editable() || event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    drag = {
      axis,
      initial: props.node.spatialRotation?.[axis] ?? 0,
      kind: 'rotation',
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    root?.setPointerCapture?.(event.pointerId)
    props.onEditStart?.()
  }
  const startTranslationDrag = (event: PointerEvent, axis: number) => {
    const point = pointerPoint(event)
    if (!editable() || event.button !== 0 || point === undefined) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    root?.focus()
    drag = {
      axis,
      initial: props.node.spatialTranslation?.[axis] ?? 0,
      kind: 'translation',
      point,
      pointerId: event.pointerId,
    }
    root?.setPointerCapture?.(event.pointerId)
    props.onEditStart?.()
  }
  const moveDrag = (event: PointerEvent) => {
    if (drag === undefined || drag.pointerId !== event.pointerId) {
      return
    }
    if (drag.kind === 'rotation') {
      const movement = drag.axis === 0 ? drag.y - event.clientY : event.clientX - drag.x
      setRotation(drag.axis, drag.initial + (movement * HALF_ROTATION) / viewBox().width)
      return
    }
    const point = pointerPoint(event)
    if (point === undefined) {
      return
    }
    const movement =
      drag.axis === 0
        ? point.x - drag.point.x
        : drag.axis === 1
          ? point.y - drag.point.y
          : drag.point.y - point.y
    setTranslation(drag.axis, drag.initial + movement)
  }
  const stopDrag = (event: PointerEvent) => {
    if (drag?.pointerId !== event.pointerId) {
      return
    }
    if (root?.hasPointerCapture?.(event.pointerId)) {
      root.releasePointerCapture(event.pointerId)
    }
    drag = undefined
    props.onEditEnd?.()
  }
  const stepRotation = (event: KeyboardEvent, axis: number) => {
    if (!editable() || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      return
    }
    event.preventDefault()
    props.onEditStart?.()
    setRotation(
      axis,
      (props.node.spatialRotation?.[axis] ?? 0) +
        (event.key === 'ArrowRight' ? KEYBOARD_STEP : -KEYBOARD_STEP),
    )
    props.onEditEnd?.()
  }
  const stepTranslation = (event: KeyboardEvent, axis: number) => {
    if (!editable() || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) {
      return
    }
    event.preventDefault()
    props.onEditStart?.()
    setTranslation(
      axis,
      (props.node.spatialTranslation?.[axis] ?? 0) +
        (event.key === 'ArrowRight' ? KEYBOARD_STEP : -KEYBOARD_STEP),
    )
    props.onEditEnd?.()
  }
  return (
    <div class="deformer-editor">
      <svg
        ref={(element) => {
          root = element
        }}
        aria-label="3D 디포머 조작 영역"
        tabindex={0}
        viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
        onPointerMove={moveDrag}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={stopDrag}
      >
        <g class="spatial-deformer-controls">
          <For each={axes}>
            {(axis, index) => (
              <ellipse
                role="button"
                tabindex={editable() ? 0 : -1}
                aria-disabled={!editable()}
                aria-label={`3D ${axis}축 회전`}
                aria-keyshortcuts="ArrowLeft ArrowRight"
                class={`spatial-rotation-axis spatial-rotation-axis-${axis.toLowerCase()}`}
                cx={screenOrigin().x}
                cy={screenOrigin().y}
                rx={index() === 0 ? radius() / AXIS_DEPTH_RATIO : radius()}
                ry={index() === 1 ? radius() / AXIS_DEPTH_RATIO : radius()}
                onPointerDown={(event) => startRotationDrag(event, index())}
                onKeyDown={(event) => stepRotation(event, index())}
              />
            )}
          </For>
          <For each={axes}>
            {(axis, index) => (
              <g class={`spatial-translation-axis spatial-translation-axis-${axis.toLowerCase()}`}>
                <line
                  x1={screenOrigin().x}
                  y1={screenOrigin().y}
                  x2={moveHandle(index()).x}
                  y2={moveHandle(index()).y}
                />
                <circle
                  role="button"
                  tabindex={editable() ? 0 : -1}
                  aria-disabled={!editable()}
                  aria-label={`3D ${axis}축 이동`}
                  aria-keyshortcuts="ArrowLeft ArrowRight"
                  cx={moveHandle(index()).x}
                  cy={moveHandle(index()).y}
                  onPointerDown={(event) => startTranslationDrag(event, index())}
                  onKeyDown={(event) => stepTranslation(event, index())}
                />
                <text
                  x={moveHandle(index()).x}
                  y={moveHandle(index()).y}
                  text-anchor="middle"
                  dominant-baseline="central"
                >
                  {axis}
                </text>
              </g>
            )}
          </For>
          <Show when={props.node.spatialMesh === undefined}>
            <text x={screenOrigin().x} y={screenOrigin().y} text-anchor="middle">
              3D 메시를 만들어 주세요
            </text>
          </Show>
        </g>
      </svg>
    </div>
  )
}
