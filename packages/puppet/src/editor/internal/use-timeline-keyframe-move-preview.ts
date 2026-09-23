import {type Accessor, createSignal} from 'solid-js'

import {
  getKeyframeMoveTarget,
  isKeyframeSelected,
  type KeyframeSelection,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
} from './timeline-keyframe-selection'

interface MovePreview {
  readonly parameterId: string
  readonly sourceTime: number
  readonly targetTime: number
}

export interface UseTimelineKeyframeMovePreviewProps {
  readonly duration: Accessor<number>
  readonly selection: Accessor<KeyframeSelection | null>
}

export const useTimelineKeyframeMovePreview = (props: UseTimelineKeyframeMovePreviewProps) => {
  const [preview, setPreview] = createSignal<MovePreview | null>(null)
  const previewMove = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    requestedTime: number,
  ) => {
    const parameterId = track.parameter.id
    const targetTime = getKeyframeMoveTarget({
      duration: props.duration(),
      parameterId,
      requestedTime,
      selection: props.selection(),
      sourceTime: keyframe.time,
    })
    setPreview({parameterId, sourceTime: keyframe.time, targetTime})
    return targetTime
  }
  const getPreviewTime = (parameterId: string, keyframe: ParameterTimelineKeyframe) => {
    const current = preview()
    if (
      current === null ||
      current.parameterId !== parameterId ||
      !isKeyframeSelected(props.selection(), parameterId, keyframe.time)
    ) {
      return undefined
    }
    return keyframe.time + current.targetTime - current.sourceTime
  }

  return {
    endPreview: () => setPreview(null),
    getPreviewTime,
    previewMove,
  }
}
