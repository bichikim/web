import {type Accessor, createEffect, createMemo, on} from 'solid-js'
import {sampleTimelineRowValues} from '../timeline-row-values'
import {
  getKeyframeSelectionAtTime,
  getParameterTracks,
  isKeyframeSelected,
  type ParameterTimelineKeyframe,
  type ParameterTimelineTrack,
  retainKeyframeSelectionAtTime,
  updateKeyframeSelection,
} from '../timeline-keyframe-selection'
import type {AllMotionTimelineGroupProps} from './types'

export const useAllMotionTimelineGroup = (source: Accessor<AllMotionTimelineGroupProps>) => {
  const tracks = createMemo(() => getParameterTracks(source().document, source().motion))
  const values = createMemo(() =>
    sampleTimelineRowValues({
      document: source().document,
      motion: source().motion,
      parameterValues: source().parameterValues,
      time: source().currentTime,
    }),
  )
  const minimumDuration = () =>
    Math.max(
      1 / source().framesPerSecond,
      ...source().motion.tracks.flatMap((track) =>
        track.keyframes.map((keyframe) => keyframe.time),
      ),
    )
  const handleKeyframeSelect = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    extend: boolean,
  ) => {
    const parameterId = track.parameter.id
    source().onParameterSelect(parameterId)
    source().onSelectionChange(
      updateKeyframeSelection(source().selection, parameterId, keyframe.time, extend),
    )
    source().onSeek?.(keyframe.time)
  }
  const handleKeyframeMove = (
    track: ParameterTimelineTrack,
    keyframe: ParameterTimelineKeyframe,
    time: number,
  ) => {
    const parameterId = track.parameter.id
    const selectedTimes = isKeyframeSelected(source().selection, parameterId, keyframe.time)
      ? source().selection!.times
      : [keyframe.time]

    if (
      source().onKeyframeMove?.({
        nextTime: time,
        parameterId,
        time: keyframe.time,
        times: selectedTimes,
      }) !== true
    ) {
      return
    }

    const timeOffset = time - keyframe.time
    source().onParameterSelect(parameterId)
    source().onSelectionChange({
      parameterId,
      time,
      times: selectedTimes.map((selectedTime) => selectedTime + timeOffset),
    })
    source().onSeek?.(time)
  }
  const handleParameterSelect = (parameterId: string) => {
    source().onSelectionChange(
      getKeyframeSelectionAtTime(
        tracks(),
        source().currentTime,
        parameterId,
        source().framesPerSecond,
      ),
    )
    source().onParameterSelect(parameterId)
  }
  const handleSeek = (time: number, parameterId?: string) => {
    const selectedParameterId = parameterId ?? source().selectedParameterId

    if (parameterId !== undefined) {
      source().onParameterSelect(parameterId)
    }
    source().onSelectionChange(
      getKeyframeSelectionAtTime(tracks(), time, selectedParameterId, source().framesPerSecond),
    )
    source().onSeek?.(time)
  }

  const handleKeyframeAdd = (track: ParameterTimelineTrack, time: number) =>
    source().onKeyframeAdd?.(track.parameter.id, time) === true
  const handleKeyframesDelete = (track: ParameterTimelineTrack, times: ReadonlyArray<number>) => {
    if (source().onKeyframesDelete?.(track.parameter.id, times) !== true) {
      return false
    }
    source().onSelectionChange(null)
    return true
  }

  createEffect(
    on(
      () => source().currentTime,
      (time) => {
        const parameterId = source().selection?.parameterId ?? source().selectedParameterId
        if (parameterId === null) {
          return
        }
        source().onSelectionChange(
          retainKeyframeSelectionAtTime({
            framesPerSecond: source().framesPerSecond,
            parameterId,
            selection: source().selection,
            time,
            tracks: tracks(),
          }),
        )
      },
      {defer: true},
    ),
  )

  return {
    handleKeyframeAdd,
    handleKeyframeMove,
    handleKeyframesDelete,
    handleKeyframeSelect,
    handleParameterSelect,
    handleSeek,
    minimumDuration,
    tracks,
    values,
  }
}
