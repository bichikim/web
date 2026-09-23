import {createSignal} from 'solid-js'

import {EditorDiamondButton} from '../../design-system'
import type {ParameterTimelineKeyframe, ParameterTimelineTrack} from './timeline-keyframe-selection'

interface KeyframeDrag {
  readonly pointerId: number
  readonly targetTime: number
}

export interface TimelineKeyframeMarkerProps {
  readonly duration: number
  readonly framesPerSecond: number
  readonly getTime: (clientX: number, bounds: DOMRect) => number
  readonly keyframe: ParameterTimelineKeyframe
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onMove?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => void
  readonly onMovePreview?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => number
  readonly onMovePreviewEnd?: () => void
  readonly onSelect?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    extend: boolean,
  ) => void
  readonly parameterName: string
  readonly previewTime?: number
  readonly selected: boolean
  readonly snapTime: (time: number) => number
  readonly track: ParameterTimelineTrack
}

const PERCENT = 100

export const TimelineKeyframeMarker = (props: TimelineKeyframeMarkerProps) => {
  const [drag, setDrag] = createSignal<KeyframeDrag | null>(null)
  let suppressClick = false
  const displayTime = () => props.previewTime ?? drag()?.targetTime ?? props.keyframe.time
  const handlePointerDown = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.button !== 0 || props.onMove === undefined) {
      return
    }

    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    suppressClick = !props.selected
    setDrag({pointerId: event.pointerId, targetTime: props.keyframe.time})
    if (!props.selected) {
      props.onSelect?.(props.track, props.keyframe, event.shiftKey)
    }
    props.onEditStart?.()
  }
  const handlePointerMove = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    const currentDrag = drag()
    const timelineRow = event.currentTarget.parentElement

    if (currentDrag === null || currentDrag.pointerId !== event.pointerId || timelineRow === null) {
      return
    }

    const requestedTime = props.getTime(event.clientX, timelineRow.getBoundingClientRect())
    const targetTime =
      props.onMovePreview?.(props.track, props.keyframe, requestedTime) ?? requestedTime
    setDrag({
      ...currentDrag,
      targetTime,
    })
  }
  const finishDrag = (
    event: PointerEvent & {currentTarget: HTMLButtonElement},
    commit: boolean,
  ) => {
    const currentDrag = drag()

    if (currentDrag === null || currentDrag.pointerId !== event.pointerId) {
      return
    }

    suppressClick ||= currentDrag.targetTime !== props.keyframe.time
    setDrag(null)
    if (commit && suppressClick) {
      props.onMove?.(props.track, props.keyframe, currentDrag.targetTime)
    }
    props.onMovePreviewEnd?.()
    props.onEditEnd?.()
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    const frameDirection = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0

    if (frameDirection === 0 || props.onMove === undefined) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const targetTime = props.snapTime(props.keyframe.time + frameDirection / props.framesPerSecond)

    if (targetTime === props.keyframe.time) {
      return
    }

    props.onEditStart?.()
    props.onMove(props.track, props.keyframe, targetTime)
    props.onEditEnd?.()
  }
  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
    if (suppressClick) {
      suppressClick = false
      return
    }
    props.onSelect?.(props.track, props.keyframe, event.shiftKey)
  }

  return (
    <EditorDiamondButton
      aria-keyshortcuts={props.onMove === undefined ? undefined : 'ArrowLeft ArrowRight'}
      aria-label={`${props.parameterName} ${displayTime().toFixed(2)}초 키프레임`}
      aria-pressed={props.selected}
      class="timeline-keyframe"
      data-draggable={props.onMove === undefined ? undefined : ''}
      data-dragging={drag() === null ? undefined : ''}
      style={{
        left: `${props.duration === 0 ? 0 : (displayTime() / props.duration) * PERCENT}%`,
      }}
      type="button"
      title="Shift+클릭하여 키프레임 다중 선택"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onLostPointerCapture={(event) => finishDrag(event, false)}
      onPointerCancel={(event) => finishDrag(event, false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishDrag(event, true)}
    />
  )
}
