import {createEffect, For} from 'solid-js'

import type {PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {createGridPaths, createTranslationPath} from './deformer-paths'
import {getDeformerPoint} from './deformer-transform'
import {DeformerCurveControls} from './DeformerCurveControls'
import {
  type DeformerControlSelection,
  type DeformerDragTarget,
  type DeformerSelectionModifiers,
} from './deformer-control-selection'

export interface DeformerControlsProps {
  readonly controlSelection: DeformerControlSelection
  readonly deformer: PuppetSceneDeformerNode
  readonly editable: boolean
  readonly handle: PuppetPoint
  readonly moveCurveHandle: (
    pointIndex: number,
    axis: 'horizontal' | 'vertical',
    point: PuppetPoint,
  ) => void
  readonly movePoint: (pointIndex: number, point: PuppetPoint) => void
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
  createEffect(() => {
    props.controlSelection.syncTopology({
      columns: props.deformer.columns,
      nodeId: props.deformer.id,
      rows: props.deformer.rows,
    })
  })
  const isSelected = (target: DeformerDragTarget) =>
    props.controlSelection.isSelected(props.deformer.id, target)
  const selectTarget = (event: DeformerSelectionModifiers, target: DeformerDragTarget) =>
    props.controlSelection.select(event, props.deformer.id, target)
  const startDrag = (event: PointerEvent, target: DeformerDragTarget) => {
    if (event.button === 0 && props.editable) {
      selectTarget(event, target)
    }
    props.startDrag(event, target)
  }
  const startTranslationDrag = (event: PointerEvent) => {
    if (event.button === 0 && props.editable) {
      props.controlSelection.clear()
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
        selectedPointIndices={props.controlSelection.selectedPointIndices()}
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
