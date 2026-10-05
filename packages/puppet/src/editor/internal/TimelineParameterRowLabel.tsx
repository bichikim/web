import {createEffect, createUniqueId, on} from 'solid-js'

import type {ParameterTimelineTrack} from './timeline-keyframe-selection'
import {TimelineParameterValueField} from './TimelineParameterValueField'
import {useSwipeDelete} from './use-swipe-delete'

export interface TimelineParameterRowLabelProps {
  readonly disabled: boolean
  readonly onEditEnd?: () => void
  readonly onEditStart?: () => void
  readonly onParameterRemove?: (parameterId: string) => void
  readonly onParameterSelect?: (parameterId: string) => void
  readonly onParameterValueChange?: (track: ParameterTimelineTrack, value: number) => void
  readonly selected: boolean
  readonly track: ParameterTimelineTrack
  readonly value?: number
}

export const TimelineParameterRowLabel = (props: TimelineParameterRowLabelProps) => {
  const descriptionId = createUniqueId()
  const handleRemove = () => props.onParameterRemove?.(props.track.parameter.id)
  const swipe = useSwipeDelete(() =>
    props.onParameterRemove === undefined ? undefined : handleRemove,
  )
  createEffect(on(() => props.track.parameter.id, swipe.reset, {defer: true}))
  const handlePointerDown = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest('input, select')) {
      return
    }
    swipe.handlePointerDown(event)
  }
  const handleClick = () => {
    if (swipe.clickState.ignore) {
      swipe.clickState.ignore = false
      return
    }
    props.onParameterSelect?.(props.track.parameter.id)
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      props.onParameterSelect?.(props.track.parameter.id)
      return
    }
    swipe.handleKeyDown(event)
  }
  const handleEditStart = () => {
    props.onParameterSelect?.(props.track.parameter.id)
    props.onEditStart?.()
  }
  const handleValueChange = (value: number) => props.onParameterValueChange?.(props.track, value)

  return (
    <div
      class="timeline-row-label-swipe"
      classList={{armed: swipe.armed(), dragging: swipe.dragging()}}
      style={{'--parameter-swipe-offset': `${swipe.offset()}px`}}
    >
      <div class="timeline-row-swipe-delete" aria-hidden="true">
        <span aria-hidden="true" class="puppet-icon puppet-icon-trash" />
        <span>{swipe.armed() ? '놓아 삭제' : '삭제'}</span>
      </div>
      <div
        class="timeline-row-label"
        data-selected={props.selected ? '' : undefined}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
      >
        <strong
          aria-describedby={descriptionId}
          aria-keyshortcuts="Delete"
          aria-label={`${props.track.parameter.name} 타임라인 행`}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={props.onParameterRemove === undefined ? undefined : 0}
        >
          {props.track.parameter.name}
        </strong>
        <TimelineParameterValueField
          disabled={props.disabled}
          parameter={props.track.parameter}
          value={props.value}
          onEditEnd={props.onEditEnd}
          onEditStart={handleEditStart}
          onValueChange={handleValueChange}
        />
      </div>
      <span id={descriptionId} class="visually-hidden">
        오른쪽으로 밀어 놓으면 타임라인에서 삭제합니다. 키보드에서는 Delete 키를 두 번 누릅니다.
      </span>
    </div>
  )
}
