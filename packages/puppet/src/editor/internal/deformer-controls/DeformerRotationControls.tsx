import type {PuppetPoint} from '../../../player'
import type {DeformerDragTarget} from '../deformer-control-selection'

interface DeformerRotationControlsProps {
  readonly editable: boolean
  readonly handle: PuppetPoint
  readonly isSelected: (target: DeformerDragTarget) => boolean
  readonly origin: PuppetPoint
  readonly radius: number
  readonly selectTarget: (event: KeyboardEvent, target: DeformerDragTarget) => void
  readonly startDrag: (event: PointerEvent, target: DeformerDragTarget) => void
}

const ROTATION_ORIGIN_HIT_RADIUS_MULTIPLIER = 2.5

const ROTATION_ORIGIN_RADIUS_MULTIPLIER = 2

export const DeformerRotationControls = (props: DeformerRotationControlsProps) => {
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
