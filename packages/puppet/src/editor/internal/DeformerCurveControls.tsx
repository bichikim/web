import {For} from 'solid-js'

import type {PuppetDeformerCurveHandle, PuppetPoint, PuppetSceneDeformerNode} from '../../player'
import {getDeformerPoint} from './deformer-transform'

export interface DeformerCurveControlsProps {
  readonly deformer: PuppetSceneDeformerNode
  readonly editable: boolean
  readonly onDragStart: (
    event: PointerEvent,
    pointIndex: number,
    axis: 'horizontal' | 'vertical',
  ) => void
  readonly onMove: (pointIndex: number, axis: 'horizontal' | 'vertical', point: PuppetPoint) => void
  readonly radius: number
  readonly transform: (point: PuppetPoint) => PuppetPoint
}

const KEYBOARD_LARGE_MOVE_DISTANCE = 10

export const DeformerCurveControls = (props: DeformerCurveControlsProps) => {
  const handleKeyDown = (
    event: KeyboardEvent,
    handle: PuppetDeformerCurveHandle,
    axis: 'horizontal' | 'vertical',
  ) => {
    if (!props.editable) {
      return
    }

    const distance = event.shiftKey ? KEYBOARD_LARGE_MOVE_DISTANCE : 1
    const point = handle[axis]
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
    props.onMove(handle.pointIndex, axis, nextPoint)
  }

  return (
    <g class="curve-deformer-controls" classList={{blocked: !props.editable}}>
      <For each={props.deformer.curveHandles ?? []}>
        {(handle) => {
          const origin = () => props.transform(getDeformerPoint(props.deformer, handle.pointIndex))
          const horizontal = () => props.transform(handle.horizontal)
          const vertical = () => props.transform(handle.vertical)

          return (
            <g>
              <line
                class="curve-handle-line"
                x1={origin().x}
                x2={horizontal().x}
                y1={origin().y}
                y2={horizontal().y}
              />
              <line
                class="curve-handle-line"
                x1={origin().x}
                x2={vertical().x}
                y1={origin().y}
                y2={vertical().y}
              />
              <circle
                aria-disabled={!props.editable}
                aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                aria-label={`격자 제어점 ${handle.pointIndex + 1} 가로 곡률 핸들`}
                class="curve-handle"
                cx={horizontal().x}
                cy={horizontal().y}
                r={props.radius}
                role="button"
                tabindex={props.editable ? 0 : -1}
                onKeyDown={(event) => handleKeyDown(event, handle, 'horizontal')}
                onPointerDown={(event) => props.onDragStart(event, handle.pointIndex, 'horizontal')}
              />
              <circle
                aria-disabled={!props.editable}
                aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
                aria-label={`격자 제어점 ${handle.pointIndex + 1} 세로 곡률 핸들`}
                class="curve-handle"
                cx={vertical().x}
                cy={vertical().y}
                r={props.radius}
                role="button"
                tabindex={props.editable ? 0 : -1}
                onKeyDown={(event) => handleKeyDown(event, handle, 'vertical')}
                onPointerDown={(event) => props.onDragStart(event, handle.pointIndex, 'vertical')}
              />
            </g>
          )
        }}
      </For>
    </g>
  )
}
