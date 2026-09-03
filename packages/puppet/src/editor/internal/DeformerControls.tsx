import {createEffect, createSignal, For, untrack} from 'solid-js'

import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {createGridPaths, createTranslationPath} from './deformer-paths'
import {getDeformerPoint} from './deformer-transform'
import {DeformerCurveControls} from './DeformerCurveControls'

export type DeformerDragTarget =
  | {readonly kind: 'controlPoint'; readonly pointIndex: number}
  | {
      readonly axis: 'horizontal' | 'vertical'
      readonly kind: 'curveHandle'
      readonly pointIndex: number
    }
  | {readonly kind: 'rotation'}
  | {readonly kind: 'rotationOrigin'}
  | {readonly kind: 'translation'; readonly previousPoint: PuppetPoint}

type ExclusiveDeformerControl = 'rotation' | 'rotationOrigin'

interface DeformerControlSelection {
  readonly exclusiveControl: ExclusiveDeformerControl | null
  readonly nodeId: string
  readonly pointIndices: ReadonlyArray<number>
}

interface SelectionModifiers {
  readonly ctrlKey: boolean
  readonly metaKey: boolean
}

interface DeformerTopology {
  readonly columns: number
  readonly nodeId: string
  readonly rows: number
}

export interface DeformerControlsProps {
  readonly deformer: PuppetSceneDeformerNode
  readonly editable: boolean
  readonly handle: PuppetPoint
  readonly moveCurveHandle: (
    pointIndex: number,
    axis: 'horizontal' | 'vertical',
    point: PuppetPoint,
  ) => void
  readonly movePoint: (pointIndex: number, point: PuppetPoint) => void
  readonly onControlPointsSelect?: (pointIndices: ReadonlyArray<number>) => void
  readonly origin: PuppetPoint
  readonly radius: number
  readonly startDrag: (event: PointerEvent, target: DeformerDragTarget) => void
  readonly startTranslationDrag: (event: PointerEvent) => void
  readonly transform: (point: PuppetPoint) => PuppetPoint
}

interface GridControlsProps {
  readonly editable: boolean
  readonly deformer: PuppetSceneDeformerNode
  readonly isSelected: (target: DeformerDragTarget) => boolean
  readonly movePoint: (pointIndex: number, point: PuppetPoint) => void
  readonly radius: number
  readonly selectTarget: (event: KeyboardEvent, target: DeformerDragTarget) => void
  readonly startDrag: (event: PointerEvent, target: DeformerDragTarget) => void
  readonly startTranslationDrag: (event: PointerEvent) => void
  readonly transform: (point: PuppetPoint) => PuppetPoint
}

interface RotationControlsProps {
  readonly editable: boolean
  readonly handle: PuppetPoint
  readonly isSelected: (target: DeformerDragTarget) => boolean
  readonly origin: PuppetPoint
  readonly radius: number
  readonly selectTarget: (event: KeyboardEvent, target: DeformerDragTarget) => void
  readonly startDrag: (event: PointerEvent, target: DeformerDragTarget) => void
}

const GRID_COORDINATES_PER_POINT = 2
const KEYBOARD_LARGE_MOVE_DISTANCE = 10
const ROTATION_ORIGIN_HIT_RADIUS_MULTIPLIER = 2.5
const ROTATION_ORIGIN_RADIUS_MULTIPLIER = 2

const getExclusiveControl = (target: DeformerDragTarget): ExclusiveDeformerControl | null => {
  switch (target.kind) {
    case 'rotation':
      return 'rotation'
    case 'rotationOrigin':
      return 'rotationOrigin'
    case 'controlPoint':
    case 'curveHandle':
    case 'translation':
      return null
    default: {
      const unreachable: never = target
      return unreachable
    }
  }
}

const getNextSelection = (
  current: DeformerControlSelection | null,
  event: SelectionModifiers,
  nodeId: string,
  target: DeformerDragTarget,
): DeformerControlSelection | null => {
  if (target.kind === 'translation') {
    return null
  }

  if (target.kind === 'curveHandle') {
    return current?.nodeId === nodeId ? current : null
  }

  if (target.kind !== 'controlPoint') {
    return {exclusiveControl: getExclusiveControl(target), nodeId, pointIndices: []}
  }

  const additive = event.metaKey || event.ctrlKey
  const currentIndices = current?.nodeId === nodeId ? current.pointIndices : []
  const pointIndices = additive
    ? currentIndices.includes(target.pointIndex)
      ? currentIndices.filter((pointIndex) => pointIndex !== target.pointIndex)
      : [...currentIndices, target.pointIndex]
    : [target.pointIndex]

  return pointIndices.length === 0 ? null : {exclusiveControl: null, nodeId, pointIndices}
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

    const target = {kind: 'controlPoint', pointIndex: point.pointIndex} satisfies DeformerDragTarget
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      props.selectTarget(event, target)
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
    props.selectTarget(event, target)
    props.movePoint(point.pointIndex, nextPoint)
  }

  return (
    <g class="grid-deformer-controls" classList={{blocked: !props.editable}}>
      <path
        aria-label="자유 변형 이동 영역"
        class="translation-handle"
        d={createTranslationPath(props.deformer, props.transform)}
        onPointerDown={(event) => props.startTranslationDrag(event)}
      />
      <For each={createGridPaths(props.deformer, props.transform)}>
        {(path) => <path d={path.data} />}
      </For>
      <For each={pointIndices()}>
        {(pointIndex) => {
          const target = {kind: 'controlPoint', pointIndex} satisfies DeformerDragTarget
          const selected = () => props.isSelected(target)
          const point = () => ({
            ...props.transform(getDeformerPoint(props.deformer, pointIndex)),
            pointIndex,
          })

          return (
            <circle
              aria-disabled={!props.editable}
              aria-keyshortcuts="Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight"
              aria-label={`격자 제어점 ${pointIndex + 1}`}
              aria-pressed={selected()}
              classList={{selected: selected()}}
              cx={point().x}
              cy={point().y}
              r={props.radius}
              role="button"
              tabindex={props.editable ? 0 : -1}
              onKeyDown={(event) => handleKeyDown(event, point())}
              onPointerDown={(event) => props.startDrag(event, target)}
            />
          )
        }}
      </For>
    </g>
  )
}

const RotationControls = (props: RotationControlsProps) => {
  const handleKeyDown = (event: KeyboardEvent, target: DeformerDragTarget) => {
    if (!props.editable || (event.key !== 'Enter' && event.key !== ' ')) {
      return
    }

    event.preventDefault()
    props.selectTarget(event, target)
  }

  return (
    <g class="rotation-deformer-controls" classList={{blocked: !props.editable}}>
      <line x1={props.origin.x} x2={props.handle.x} y1={props.origin.y} y2={props.handle.y} />
      <circle
        aria-disabled={!props.editable}
        aria-keyshortcuts="Enter Space"
        aria-label="자유 변형 회전 중심"
        aria-pressed={props.isSelected({kind: 'rotationOrigin'})}
        class="rotation-origin-hit"
        cx={props.origin.x}
        cy={props.origin.y}
        pointer-events="all"
        r={props.radius * ROTATION_ORIGIN_HIT_RADIUS_MULTIPLIER}
        role="button"
        tabindex={props.editable ? 0 : -1}
        onPointerDown={(event) => props.startDrag(event, {kind: 'rotationOrigin'})}
        onKeyDown={(event) => handleKeyDown(event, {kind: 'rotationOrigin'})}
      />
      <circle
        aria-hidden="true"
        class="rotation-origin"
        classList={{selected: props.isSelected({kind: 'rotationOrigin'})}}
        cx={props.origin.x}
        cy={props.origin.y}
        pointer-events="none"
        r={props.radius * ROTATION_ORIGIN_RADIUS_MULTIPLIER}
      />
      <circle
        aria-disabled={!props.editable}
        aria-keyshortcuts="Enter Space"
        aria-label="자유 변형 회전 핸들"
        aria-pressed={props.isSelected({kind: 'rotation'})}
        class="angle-handle"
        classList={{selected: props.isSelected({kind: 'rotation'})}}
        cx={props.handle.x}
        cy={props.handle.y}
        r={props.radius}
        role="button"
        tabindex={props.editable ? 0 : -1}
        onPointerDown={(event) => props.startDrag(event, {kind: 'rotation'})}
        onKeyDown={(event) => handleKeyDown(event, {kind: 'rotation'})}
      />
    </g>
  )
}

export const DeformerControls = (props: DeformerControlsProps) => {
  const [selection, setSelection] = createSignal<DeformerControlSelection | null>(null)
  let previousTopology: DeformerTopology | null = null
  createEffect(() => {
    const topology: DeformerTopology = {
      columns: props.deformer.columns,
      nodeId: props.deformer.id,
      rows: props.deformer.rows,
    }
    const current = untrack(selection)
    const changed =
      previousTopology !== null &&
      (topology.nodeId !== previousTopology.nodeId ||
        topology.columns !== previousTopology.columns ||
        topology.rows !== previousTopology.rows)
    previousTopology = topology

    if (current !== null && changed) {
      setSelection(null)
      untrack(() => props.onControlPointsSelect)?.([])
    }
  })
  const selectedPointIndices = () => {
    const current = selection()
    return current?.nodeId === props.deformer.id ? current.pointIndices : []
  }
  const isSelected = (target: DeformerDragTarget) => {
    const current = selection()
    if (current === null || current.nodeId !== props.deformer.id) {
      return false
    }

    switch (target.kind) {
      case 'controlPoint':
        return current.pointIndices.includes(target.pointIndex)
      case 'rotation':
      case 'rotationOrigin':
        return current.exclusiveControl === target.kind
      case 'curveHandle':
      case 'translation':
        return false
      default: {
        const unreachable: never = target
        return unreachable
      }
    }
  }
  const selectTarget = (event: SelectionModifiers, target: DeformerDragTarget) => {
    const nextSelection = getNextSelection(selection(), event, props.deformer.id, target)
    setSelection(nextSelection)
    props.onControlPointsSelect?.(nextSelection?.pointIndices ?? [])
  }
  const startDrag = (event: PointerEvent, target: DeformerDragTarget) => {
    if (event.button === 0 && props.editable) {
      selectTarget(event, target)
    }
    props.startDrag(event, target)
  }
  const startTranslationDrag = (event: PointerEvent) => {
    if (event.button === 0 && props.editable) {
      setSelection(null)
      props.onControlPointsSelect?.([])
    }
    props.startTranslationDrag(event)
  }

  return (
    <>
      <GridControls
        deformer={props.deformer}
        editable={props.editable}
        isSelected={isSelected}
        movePoint={props.movePoint}
        radius={props.radius}
        selectTarget={selectTarget}
        startDrag={startDrag}
        startTranslationDrag={startTranslationDrag}
        transform={props.transform}
      />
      <DeformerCurveControls
        deformer={props.deformer}
        editable={props.editable}
        onDragStart={(event, pointIndex, axis) =>
          startDrag(event, {axis, kind: 'curveHandle', pointIndex})
        }
        onMove={props.moveCurveHandle}
        radius={props.radius}
        selectedPointIndices={selectedPointIndices()}
        transform={props.transform}
      />
      <RotationControls
        editable={props.editable}
        handle={props.handle}
        isSelected={isSelected}
        origin={props.origin}
        radius={props.radius}
        selectTarget={selectTarget}
        startDrag={startDrag}
      />
    </>
  )
}
