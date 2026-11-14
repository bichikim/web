import {For, type JSX, Show} from 'solid-js'
import type {PuppetPoint, PuppetSceneDeformerNode} from '../../../player'
import {createGridPaths, createTranslationPath} from '../deformer-paths'
import {getDeformerPoint} from '../deformer-transform'
import type {DeformerDragTarget} from '../deformer-control-selection'

interface DeformerGridControlsProps {
  readonly children?: JSX.Element
  readonly onCurveSplit?: (event: MouseEvent) => void
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

const CUBIC_DEGREE = 3

const GRID_COORDINATES_PER_POINT = 2

const KEYBOARD_LARGE_MOVE_DISTANCE = 10

export const DeformerGridControls = (props: DeformerGridControlsProps) => {
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
        {(path) => (
          <>
            <path d={path.data} data-tangent={path.tangent} />
            <Show when={props.deformer.curveAxis !== undefined && !path.tangent}>
              <path
                class="curve-hit"
                aria-label="곡선 연결점 추가 영역"
                d={path.data}
                onDblClick={(event) => props.onCurveSplit?.(event)}
              />
            </Show>
          </>
        )}
      </For>
      {props.children}
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
              aria-label={
                props.deformer.curveAxis === undefined
                  ? `격자 제어점 ${pointIndex + 1}`
                  : `곡선 ${pointIndex % CUBIC_DEGREE === 0 ? '제어점' : '핸들'} ${pointIndex + 1}`
              }
              aria-pressed={selected()}
              classList={{selected: selected()}}
              data-tangent={
                props.deformer.curveAxis !== undefined && pointIndex % CUBIC_DEGREE !== 0
              }
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
