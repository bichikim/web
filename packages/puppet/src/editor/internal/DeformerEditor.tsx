import {Show, untrack} from 'solid-js'

import type {PuppetParameterValues} from '../../deformation'
import {
  applySceneNodeAncestorsPoint,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetSceneDeformerNode,
  unapplySceneNodeAncestorsPoint,
} from '../../player'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'
import {setDeformerCurveHandle} from './deformer-curve-handles'
import {setDeformerControlPoint, setDeformerControlPoints} from './deformer-control-points'
import {DeformerControls} from './DeformerControls'
import {
  createDeformerControlSelection,
  type DeformerControlSelection,
  type DeformerDragTarget,
} from './deformer-control-selection'
import {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from './parameter-keyforms'
import {
  getDeformerAngle,
  getDeformerRotationOrigin,
  reflectCurveHandlePoint,
  rotateDeformerControlPoints,
  rotateDeformerCurveHandles,
  translateDeformerControlPoints,
  translateDeformerCurveHandles,
} from './deformer-transform'
import {getEditorPoint, getEditorViewBox} from './viewport'

interface DeformerEditorProps {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly controlSelection?: DeformerControlSelection
  readonly previewDocument?: PuppetDocument
  readonly targetNodeIds?: ReadonlyArray<string>
}

interface PointerEditorPointOptions {
  readonly element?: SVGSVGElement
  readonly event: PointerEvent
  readonly viewBox: ReturnType<typeof getEditorViewBox>
}

type DragTarget = DeformerDragTarget

const DEGREES_PER_HALF_ROTATION = 180
const HANDLE_RADIUS_DIVISOR = 120
const ROTATION_HANDLE_LENGTH_DIVISOR = 6

const getPointerEditorPoint = (options: PointerEditorPointOptions) => {
  const bounds = options.element?.getBoundingClientRect()

  return bounds === undefined
    ? undefined
    : getEditorPoint({
        bounds,
        clientPoint: {x: options.event.clientX, y: options.event.clientY},
        viewBox: options.viewBox,
      })
}

const getSelectedDeformer = (document: PuppetDocument, nodeId?: string) => {
  const node = nodeId === undefined ? undefined : getSceneNode(document, nodeId)
  return node?.kind === 'deformer' ? node : undefined
}

const getRotationHandle = (
  deformer: PuppetSceneDeformerNode,
  length: number,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const origin = getDeformerRotationOrigin(deformer)
  const radians = (getDeformerAngle(deformer) * Math.PI) / DEGREES_PER_HALF_ROTATION
  return transform({
    x: origin.x + Math.cos(radians) * length,
    y: origin.y + Math.sin(radians) * length,
  })
}

interface UpdateDraggedDeformerOptions {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly deformer?: PuppetSceneDeformerNode
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly nodeId: string
  readonly point: PuppetPoint
  readonly target: DragTarget
}

const updateDraggedDeformer = (options: UpdateDraggedDeformerOptions) => {
  const isParameterKeyform =
    options.editMode === 'parameter' &&
    options.activeBindingId !== undefined &&
    options.activeKeyformValues !== undefined &&
    options.activeKeyformValues !== null

  if (options.target.kind === 'controlPoint') {
    return isParameterKeyform
      ? setParameterKeyformDeformerPoint({
          bindingId: options.activeBindingId,
          document: options.document,
          nodeId: options.nodeId,
          pointIndex: options.target.pointIndex,
          values: options.activeKeyformValues,
          x: options.point.x,
          y: options.point.y,
        })
      : setDeformerControlPoint({
          document: options.document,
          nodeId: options.nodeId,
          pointIndex: options.target.pointIndex,
          x: options.point.x,
          y: options.point.y,
        })
  }

  if (options.target.kind === 'curveHandle') {
    if (options.deformer === undefined) {
      return undefined
    }

    const point = reflectCurveHandlePoint({
      axis: options.target.axis,
      deformer: options.deformer,
      point: options.point,
      pointIndex: options.target.pointIndex,
    })
    return isParameterKeyform
      ? setParameterKeyformDeformerCurveHandle({
          axis: options.target.axis,
          bindingId: options.activeBindingId,
          document: options.document,
          nodeId: options.nodeId,
          point,
          pointIndex: options.target.pointIndex,
          values: options.activeKeyformValues,
        })
      : setDeformerCurveHandle({
          axis: options.target.axis,
          document: options.document,
          nodeId: options.nodeId,
          point,
          pointIndex: options.target.pointIndex,
        })
  }

  if (options.deformer === undefined) {
    return undefined
  }

  const origin = getDeformerRotationOrigin(options.deformer)

  if (options.target.kind === 'rotationOrigin') {
    const geometry = {
      controlPoints: options.deformer.controlPoints,
      curveHandles: options.deformer.curveHandles,
      rotationOrigin: options.point,
    }
    return isParameterKeyform
      ? setParameterKeyformDeformerControlPoints({
          bindingId: options.activeBindingId,
          document: options.document,
          nodeId: options.nodeId,
          values: options.activeKeyformValues,
          ...geometry,
        })
      : setDeformerControlPoints({...geometry, document: options.document, nodeId: options.nodeId})
  }

  const isTranslation = options.target.kind === 'translation'
  const offset = isTranslation
    ? {
        x: options.point.x - options.target.previousPoint.x,
        y: options.point.y - options.target.previousPoint.y,
      }
    : {x: options.point.x - origin.x, y: options.point.y - origin.y}
  const degrees =
    (Math.atan2(options.point.y - origin.y, options.point.x - origin.x) *
      DEGREES_PER_HALF_ROTATION) /
      Math.PI -
    getDeformerAngle(options.deformer)
  const controlPoints = isTranslation
    ? translateDeformerControlPoints({
        controlPoints: options.deformer.controlPoints,
        offset,
      })
    : rotateDeformerControlPoints({
        controlPoints: options.deformer.controlPoints,
        degrees,
        origin,
      })
  const curveHandles = isTranslation
    ? translateDeformerCurveHandles({curveHandles: options.deformer.curveHandles, offset})
    : rotateDeformerCurveHandles({
        curveHandles: options.deformer.curveHandles,
        degrees,
        origin,
      })
  const rotationOrigin = isTranslation ? {x: origin.x + offset.x, y: origin.y + offset.y} : origin

  return isParameterKeyform
    ? setParameterKeyformDeformerControlPoints({
        bindingId: options.activeBindingId,
        controlPoints,
        curveHandles,
        document: options.document,
        nodeId: options.nodeId,
        rotationOrigin,
        values: options.activeKeyformValues,
      })
    : setDeformerControlPoints({
        controlPoints,
        curveHandles,
        document: options.document,
        nodeId: options.nodeId,
        rotationOrigin,
      })
}

interface EditBlockOptions {
  readonly activeBindingId?: string
  readonly activeKeyformValues?: PuppetParameterValues | null
  readonly activeNodeId?: string
  readonly document: PuppetDocument
  readonly editMode?: 'motion' | 'parameter'
  readonly targetNodeIds?: ReadonlyArray<string>
}

const getEditBlockMessage = (options: EditBlockOptions) => {
  if (
    options.activeNodeId !== undefined &&
    isSceneNodeLocked(options.document, options.activeNodeId)
  ) {
    return '잠긴 디포머는 편집할 수 없습니다.'
  }

  if (options.editMode !== 'parameter') {
    return undefined
  }

  if (options.activeBindingId === undefined) {
    return 'Parameter를 선택해야 디포머를 편집할 수 있습니다.'
  }

  if (
    options.activeNodeId === undefined ||
    options.targetNodeIds?.includes(options.activeNodeId) !== true
  ) {
    return '현재 Parameter에 연결되지 않은 디포머입니다. 아래의 ‘선택 레이어 연결’을 누르세요.'
  }

  return options.activeKeyformValues === undefined || options.activeKeyformValues === null
    ? '현재 값에 키폼을 추가해야 디포머를 편집할 수 있습니다.'
    : undefined
}

export const DeformerEditor = (props: DeformerEditorProps) => {
  const controlSelection = untrack(() => props.controlSelection) ?? createDeformerControlSelection()
  let dragTarget: DragTarget | null = null
  let svgElement: SVGSVGElement | undefined
  const displayDocument = () => props.previewDocument ?? props.document
  const deformer = () => getSelectedDeformer(displayDocument(), props.activeNodeId)
  const editBlockMessage = () =>
    getEditBlockMessage({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      activeNodeId: props.activeNodeId,
      document: props.document,
      editMode: props.editMode,
      targetNodeIds: props.targetNodeIds,
    })
  const editable = () => editBlockMessage() === undefined
  const viewBox = () => getEditorViewBox(displayDocument())
  const handleRadius = () => Math.min(viewBox().width, viewBox().height) / HANDLE_RADIUS_DIVISOR
  const transformPoint = (point: PuppetPoint) =>
    applySceneNodeAncestorsPoint({
      document: displayDocument(),
      nodeId: props.activeNodeId ?? '',
      point,
    })
  const untransformPoint = (point: PuppetPoint) =>
    unapplySceneNodeAncestorsPoint({
      document: displayDocument(),
      nodeId: props.activeNodeId ?? '',
      point,
    })
  const rotationOrigin = (activeDeformer: PuppetSceneDeformerNode) =>
    transformPoint(getDeformerRotationOrigin(activeDeformer))
  const getPointerPoint = (event: PointerEvent) =>
    getPointerEditorPoint({element: svgElement, event, viewBox: viewBox()})
  const startDrag = (event: PointerEvent, target: DragTarget) => {
    if (event.button !== 0 || !editable()) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    dragTarget = target
    svgElement?.setPointerCapture?.(event.pointerId)
    props.onEditStart?.()
  }
  const startTranslationDrag = (event: PointerEvent) => {
    const point = getPointerPoint(event)

    if (point === undefined) {
      return
    }

    startDrag(event, {kind: 'translation', previousPoint: untransformPoint(point)})
  }

  const updateDeformer = (target: DragTarget, point: PuppetPoint) => {
    const activeNodeId = untrack(() => props.activeNodeId)

    if (activeNodeId === undefined || !editable()) {
      return
    }

    const document = updateDraggedDeformer({
      activeBindingId: props.activeBindingId,
      activeKeyformValues: props.activeKeyformValues,
      deformer: deformer(),
      document: props.document,
      editMode: props.editMode,
      nodeId: activeNodeId,
      point: untransformPoint(point),
      target,
    })

    if (document !== undefined) {
      props.onDocumentChange?.(document)
    }
  }
  const handlePointerMove = (event: PointerEvent) => {
    const target = dragTarget
    const activeNodeId = untrack(() => props.activeNodeId)

    if (target === null || activeNodeId === undefined) {
      return
    }

    const point = getPointerPoint(event)

    if (point === undefined) {
      return
    }

    updateDeformer(target, point)

    if (target.kind === 'translation') {
      dragTarget = {...target, previousPoint: untransformPoint(point)}
    }
  }

  const stopDrag = () => {
    if (dragTarget !== null) {
      props.onEditEnd?.()
    }
    dragTarget = null
  }

  return (
    <Show when={deformer()}>
      {(activeDeformer) => (
        <div class="deformer-editor">
          <svg
            ref={(element) => {
              svgElement = element
            }}
            aria-label="디포머 편집 영역"
            preserveAspectRatio="xMidYMid meet"
            viewBox={`${viewBox().x} ${viewBox().y} ${viewBox().width} ${viewBox().height}`}
            onPointerCancel={stopDrag}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
          >
            <DeformerControls
              controlSelection={controlSelection}
              deformer={activeDeformer()}
              editable={editable()}
              handle={getRotationHandle(
                activeDeformer(),
                Math.min(viewBox().width, viewBox().height) / ROTATION_HANDLE_LENGTH_DIVISOR,
                transformPoint,
              )}
              moveCurveHandle={(pointIndex, axis, point) =>
                updateDeformer({axis, kind: 'curveHandle', pointIndex}, point)
              }
              movePoint={(pointIndex, point) =>
                updateDeformer({kind: 'controlPoint', pointIndex}, point)
              }
              origin={rotationOrigin(activeDeformer())}
              radius={handleRadius()}
              startDrag={startDrag}
              startTranslationDrag={startTranslationDrag}
              transform={transformPoint}
            />
          </svg>
          <Show when={editBlockMessage()}>
            {(message) => (
              <p class="deformer-edit-message" role="status">
                {message()}
              </p>
            )}
          </Show>
        </div>
      )}
    </Show>
  )
}
