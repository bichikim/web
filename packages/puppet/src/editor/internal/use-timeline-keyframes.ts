import {type Accessor, createMemo} from 'solid-js'
import {
  isKeyframeSelected,
  type KeyframeSelection,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
} from './timeline-keyframe-selection'
import {
  reconcileTimelineKeyframes,
  type TimelineKeyframeMove,
  type TimelineKeyframeView,
} from './reconcile-timeline-keyframes'

export interface UseTimelineKeyframesProps {
  readonly onMove?: (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => void
  readonly selection: Accessor<KeyframeSelection | null>
  readonly track: Accessor<ParameterTimelineTrack>
}

export const useTimelineKeyframes = (props: UseTimelineKeyframesProps) => {
  let pendingMoves: ReadonlyArray<TimelineKeyframeMove> | undefined
  const views = createMemo<ReadonlyArray<TimelineKeyframeView>>(
    (previous) =>
      reconcileTimelineKeyframes({
        keyframes: props.track().keyframes,
        moves: pendingMoves,
        previous,
      }),
    [],
  )
  const move = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => {
    const selection = props.selection()
    const times = isKeyframeSelected(selection, track.parameter.id, keyframe.time)
      ? selection!.times
      : [keyframe.time]
    pendingMoves = times.map((sourceTime) => ({
      sourceTime,
      targetTime: sourceTime + time - keyframe.time,
    }))
    try {
      props.onMove?.(track, keyframe, time)
    } finally {
      pendingMoves = undefined
    }
  }
  return {move, views}
}
