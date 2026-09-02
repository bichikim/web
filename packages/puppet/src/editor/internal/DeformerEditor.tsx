import {For, Show, untrack} from 'solid-js'

import type {PuppetParameterValues} from '../../deformation'
import {
  applySceneNodeAncestorsPoint,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetSceneDeformerNode,
  transformDeformerPoint,
  unapplySceneNodeAncestorsPoint,
} from '../../player'
import {getSceneNode, isSceneNodeLocked} from './scene-graph'
import {setDeformerCurveHandle} from './deformer-curve-handles'
import {setDeformerControlPoint, setDeformerControlPoints} from './deformer-control-points'
import {DeformerCurveControls} from './DeformerCurveControls'
import {
  setParameterKeyformDeformerControlPoints,
  setParameterKeyformDeformerCurveHandle,
  setParameterKeyformDeformerPoint,
} from './parameter-keyforms'
import {
  getDeformerAngle,
  getDeformerCenter,
  getDeformerPoint,
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
  readonly onEditStart?: () => void
  readonly previewDocument?: PuppetDocument
  readonly targetNodeIds?: ReadonlyArray<string>
}

interface GridPath {
  readonly data: string
}

type DragTarget =
  | {readonly kind: 'controlPoint'; readonly pointIndex: number}
  | {
      readonly axis: 'horizontal' | 'vertical'
      readonly kind: 'curveHandle'
      readonly pointIndex: number
    }
  | {readonly kind: 'rotation'}
  | {readonly kind: 'translation'}

const DEGREES_PER_HALF_ROTATION = 180
const GRID_COORDINATES_PER_POINT = 2
const HANDLE_RADIUS_DIVISOR = 120
const KEYBOARD_LARGE_MOVE_DISTANCE = 10
const ROTATION_HANDLE_LENGTH_DIVISOR = 6
const GRID_CURVE_SEGMENTS_PER_CELL = 8

const getRotationHandle = (
  deformer: PuppetSceneDeformerNode,
  length: number,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const origin = getDeformerCenter(deformer)
  const radians = (getDeformerAngle(deformer) * Math.PI) / DEGREES_PER_HALF_ROTATION
  return transform({
    x: origin.x + Math.cos(radians) * length,
    y: origin.y + Math.sin(radians) * length,
  })
}

const createPathData = (points: ReadonlyArray<PuppetPoint>) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

const createGridPaths = (
  node: PuppetSceneDeformerNode,
  transform: (point: PuppetPoint) => PuppetPoint,
) => {
  const paths: GridPath[] = []
  const horizontalSegments = node.columns * GRID_CURVE_SEGMENTS_PER_CELL
  const verticalSegments = node.rows * GRID_CURVE_SEGMENTS_PER_CELL

  for (let row = 0; row <= node.rows; row += 1) {
    const y = node.bounds.y + (node.bounds.height * row) / node.rows
    const points = Array.from({length: horizontalSegments + 1}, (_, index) =>
      transform(
        transformDeformerPoint(node, {
          x: node.bounds.x + (node.bounds.width * index) / horizontalSegments,
          y,
        }),
      ),
    )
    paths.push({data: createPathData(points)})
  }

  for (let column = 0; column <= node.columns; column += 1) {
    const x = node.bounds.x + (node.bounds.width * column) / node.columns
    const points = Array.from({length: verticalSegments + 1}, (_, index) =>
      transform(
        transformDeformerPoint(node, {
          x,
          y: node.bounds.y + (node.bounds.height * index) / verticalSegments,
        }),
      ),
    )
    paths.push({data: createPathData(points)})
  }

  return paths
}

interface GridControlsProps {
  readonly editable: boolean
  readonly deformer: PuppetSceneDeformerNode
  readonly radius: number
  readonly movePoint: (pointIndex: number, point: PuppetPoint) => void
  readonly startDrag: (event: PointerEvent, target: DragTarget) => void
  readonly transform: (point: PuppetPoint) => PuppetPoint
}

const GridControls = (props: GridControlsProps) => {
  const pointIndices = () =>
    Array.from(
      {length: props.deformer.controlPoints.length / GRID_COORDINATES_PER_POINT},
      (_, pointIndex) => pointIndex,
    )
  const handleKeyDown = (
    event: KeyboardEvent,
    point: PuppetPoint & {readonly pointIndex: number},
  ) => {
    if (!props.editable) {
      return
    }

    const distance = event.shiftKey ? KEYBOARD_LARGE_MOVE_DISTANCE : 1
    let nextPoint: PuppetPoint | undefined

    switch (event.key) {
      case 'ArrowDown':
        nextPoint = {...point, y: point.y + distance}
        break
      case 'ArrowLeft':
        nextPoint = {...point, x: point.x - distance}
        break
      case 'ArrowRight':
        nextPoint = {...point, x: point.x + distance}
        break
      case 'ArrowUp':
        nextPoint = {...point, y: point.y - distance}
        break
      default:
        return
    }

    event.preventDefault()
    props.movePoint(point.pointIndex, nextPoint)
  }

  return (
    <g class="grid-deformer-controls" classList={{blocked: !props.editable}}>
      <For each={createGridPaths(props.deformer, props.transform)}>
        {(path) => <path d={path.data} />}
      </For>
      <For each={pointIndices()}>
        {(pointIndex) => {
          const point = () => ({
            ...props.transform(getDeformerPoint(props.deformer, pointIndex)),
            pointIndex,
          })

          return (
            <circle
              aria-disabled={!props.editable}
              aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
              aria-label={`격자 제어점 ${pointIndex + 1}`}
              cx={point().x}
              cy={point().y}
              r={props.radius}
              role="button"
              tabindex={props.editable ? 0 : -1}
              onKeyDown={(event) => handleKeyDown(event, point())}
              onPointerDown={(event) => props.startDrag(event, {kind: 'controlPoint', pointIndex})}
            />
          )
        }}
      </For>
    </g>
  )
}

interface RotationControlsProps {
  readonly editable: boolean
  readonly handle: PuppetPoint
  readonly origin: PuppetPoint
  readonly radius: number
  readonly startDrag: (event: PointerEvent, target: DragTarget) => void
}

const RotationControls = (props: RotationControlsProps) => (
  <g class="rotation-deformer-controls" classList={{blocked: !props.editable}}>
    <line x1={props.origin.x} x2={props.handle.x} y1={props.origin.y} y2={props.handle.y} />
    <circle
      aria-disabled={!props.editable}
      aria-label="자유 변형 중심"
      cx={props.origin.x}
      cy={props.origin.y}
      r={props.radius}
      role="button"
      onPointerDown={(event) => props.startDrag(event, {kind: 'translation'})}
    />
    <circle
      aria-disabled={!props.editable}
      aria-label="자유 변형 회전 핸들"
      class="angle-handle"
      cx={props.handle.x}
      cy={props.handle.y}
      r={props.radius}
      role="button"
      onPointerDown={(event) => props.startDrag(event, {kind: 'rotation'})}
    />
  </g>
)

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
    return isParameterKeyform
      ? setParameterKeyformDeformerCurveHandle({
          axis: options.target.axis,
          bindingId: options.activeBindingId,
          document: options.document,
          nodeId: options.nodeId,
          point: options.point,
          pointIndex: options.target.pointIndex,
          values: options.activeKeyformValues,
        })
      : setDeformerCurveHandle({
          axis: options.target.axis,
          document: options.document,
          nodeId: options.nodeId,
          point: options.point,
          pointIndex: options.target.pointIndex,
        })
  }

  if (options.deformer === undefined) {
    return undefined
  }

  const center = getDeformerCenter(options.deformer)
  const isTranslation = options.target.kind === 'translation'
  const offset = {x: options.point.x - center.x, y: options.point.y - center.y}
  const degrees =
    (Math.atan2(options.point.y - center.y, options.point.x - center.x) *
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
        origin: center,
      })
  const curveHandles = isTranslation
    ? translateDeformerCurveHandles({curveHandles: options.deformer.curveHandles, offset})
    : rotateDeformerCurveHandles({
        curveHandles: options.deformer.curveHandles,
        degrees,
        origin: center,
      })

  return isParameterKeyform
    ? setParameterKeyformDeformerControlPoints({
        bindingId: options.activeBindingId,
        controlPoints,
        curveHandles,
        document: options.document,
        nodeId: options.nodeId,
        values: options.activeKeyformValues,
      })
    : setDeformerControlPoints({
        controlPoints,
        curveHandles,
        document: options.document,
        nodeId: options.nodeId,
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
  let dragTarget: DragTarget | null = null
  let svgElement: SVGSVGElement | undefined
  const displayDocument = () => props.previewDocument ?? props.document
  const node = () =>
    props.activeNodeId === undefined
      ? undefined
      : getSceneNode(displayDocument(), props.activeNodeId)
  const deformer = () => {
    const candidate = node()
    return candidate?.kind === 'deformer' ? candidate : undefined
  }
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
    transformPoint(getDeformerCenter(activeDeformer))
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

    const bounds = svgElement?.getBoundingClientRect()

    if (bounds === undefined) {
      return
    }

    const point = getEditorPoint({
      bounds,
      clientPoint: {x: event.clientX, y: event.clientY},
      viewBox: viewBox(),
    })
    updateDeformer(target, point)
  }

  const stopDrag = () => {
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
            <GridControls
              deformer={activeDeformer()}
              editable={editable()}
              movePoint={(pointIndex, point) =>
                updateDeformer({kind: 'controlPoint', pointIndex}, point)
              }
              radius={handleRadius()}
              startDrag={startDrag}
              transform={transformPoint}
            />
            <DeformerCurveControls
              deformer={activeDeformer()}
              editable={editable()}
              onDragStart={(event, pointIndex, axis) =>
                startDrag(event, {axis, kind: 'curveHandle', pointIndex})
              }
              onMove={(pointIndex, axis, point) =>
                updateDeformer({axis, kind: 'curveHandle', pointIndex}, point)
              }
              radius={handleRadius()}
              transform={transformPoint}
            />
            <RotationControls
              editable={editable()}
              handle={getRotationHandle(
                activeDeformer(),
                Math.min(viewBox().width, viewBox().height) / ROTATION_HANDLE_LENGTH_DIVISOR,
                transformPoint,
              )}
              origin={rotationOrigin(activeDeformer())}
              radius={handleRadius()}
              startDrag={startDrag}
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
