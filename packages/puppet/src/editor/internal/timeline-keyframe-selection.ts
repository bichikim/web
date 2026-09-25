import {sortBy} from 'es-toolkit/array'
import {clamp} from 'es-toolkit/math'

import {
  DEFAULT_PUPPET_FRAMES_PER_SECOND,
  PUPPET_EASINGS,
  type PuppetDocument,
  type PuppetEasing,
  type PuppetMotion,
  type PuppetParameter,
} from '../../player/document'
import {deleteParameterKeyframes, setParameterKeyframesEasing} from './motion-keyframes'
import {getVisibleParameters} from './parameter-presentation'

export interface KeyframeSelection {
  readonly parameterId: string
  readonly time: number
  readonly times: ReadonlyArray<number>
}

export interface ParameterTimelineKeyframe {
  readonly easing: PuppetEasing
  readonly time: number
}

export interface ParameterTimelineTrack {
  readonly keyframes: ReadonlyArray<ParameterTimelineKeyframe>
  readonly parameter: PuppetParameter
}

export interface SelectedKeyframe {
  readonly editableTimes: ReadonlyArray<number>
  readonly easing: PuppetEasing
}

export const getParameterTracks = (
  document: PuppetDocument,
  motion: PuppetMotion | undefined,
): ReadonlyArray<ParameterTimelineTrack> =>
  getVisibleParameters(document).map((parameter) => {
    const track = motion?.tracks.find(
      (candidate) => candidate.kind === 'parameter' && candidate.parameterId === parameter.id,
    )
    return {
      keyframes: sortBy(track?.keyframes ?? [], ['time']).map((keyframe) => ({
        easing: keyframe.easing ?? 'linear',
        time: keyframe.time,
      })),
      parameter,
    }
  })

export const getFrame = (time: number, framesPerSecond = DEFAULT_PUPPET_FRAMES_PER_SECOND) =>
  Math.round(time * framesPerSecond)

export const getKeyframeSelectionAtTime = (
  tracks: ReadonlyArray<ParameterTimelineTrack>,
  time: number,
  selectedParameterId: string | null,
  framesPerSecond = DEFAULT_PUPPET_FRAMES_PER_SECOND,
): KeyframeSelection | null => {
  if (selectedParameterId === null) {
    return null
  }
  const track = tracks.find((candidate) => candidate.parameter.id === selectedParameterId)
  const keyframe = track?.keyframes.find(
    (candidate) => getFrame(candidate.time, framesPerSecond) === getFrame(time, framesPerSecond),
  )
  return track === undefined || keyframe === undefined
    ? null
    : {parameterId: track.parameter.id, time: keyframe.time, times: [keyframe.time]}
}

export const snapToFrame = (
  time: number,
  duration: number,
  framesPerSecond = DEFAULT_PUPPET_FRAMES_PER_SECOND,
) => clamp(getFrame(time, framesPerSecond) / framesPerSecond, 0, duration)

export const isKeyframeSelected = (
  selection: KeyframeSelection | null,
  parameterId: string,
  time: number,
) => selection?.parameterId === parameterId && selection.times.includes(time)

export const updateKeyframeSelection = (
  selection: KeyframeSelection | null,
  parameterId: string,
  time: number,
  extend: boolean,
): KeyframeSelection | null => {
  if (!extend || selection?.parameterId !== parameterId) {
    return {parameterId, time, times: [time]}
  }
  if (!selection.times.includes(time)) {
    return {...selection, time, times: [...selection.times, time]}
  }
  const times = selection.times.filter((candidate) => candidate !== time)
  return times.length === 0 ? null : {parameterId, time: times.at(-1)!, times}
}

export interface GetKeyframeMoveTargetOptions {
  readonly duration: number
  readonly parameterId: string
  readonly requestedTime: number
  readonly selection: KeyframeSelection | null
  readonly sourceTime: number
}

export const getKeyframeMoveTarget = (options: GetKeyframeMoveTargetOptions) => {
  const {selection} = options
  const times =
    selection !== null && isKeyframeSelected(selection, options.parameterId, options.sourceTime)
      ? selection.times
      : [options.sourceTime]
  const minimumTime = Math.min(...times)
  const maximumTime = Math.max(...times)
  const timeOffset = clamp(
    options.requestedTime - options.sourceTime,
    -minimumTime,
    options.duration - maximumTime,
  )
  return options.sourceTime + timeOffset
}

export interface RetainKeyframeSelectionOptions {
  readonly framesPerSecond: number
  readonly parameterId: string | null
  readonly selection: KeyframeSelection | null
  readonly time: number
  readonly tracks: ReadonlyArray<ParameterTimelineTrack>
}

export const retainKeyframeSelectionAtTime = (options: RetainKeyframeSelectionOptions) => {
  const nextSelection = getKeyframeSelectionAtTime(
    options.tracks,
    options.time,
    options.parameterId,
    options.framesPerSecond,
  )
  const {selection} = options
  return nextSelection !== null &&
    selection !== null &&
    isKeyframeSelected(selection, options.parameterId ?? '', nextSelection.time)
    ? {...selection, time: nextSelection.time}
    : nextSelection
}

export const getSelectedKeyframe = (
  selection: KeyframeSelection | null,
  tracks: ReadonlyArray<ParameterTimelineTrack>,
): SelectedKeyframe | null => {
  if (selection === null) {
    return null
  }
  const track = tracks.find((candidate) => candidate.parameter.id === selection.parameterId)
  const keyframeIndex = track?.keyframes.findIndex((keyframe) => keyframe.time === selection.time)
  const keyframe = keyframeIndex === undefined ? undefined : track?.keyframes[keyframeIndex]
  return track === undefined || keyframe === undefined || keyframeIndex === undefined
    ? null
    : {
        easing: keyframe.easing,
        editableTimes: selection.times.filter((time) => {
          const index = track.keyframes.findIndex((candidate) => candidate.time === time)
          return index >= 0 && index < track.keyframes.length - 1
        }),
      }
}

export interface EditSelectedKeyframesOptions {
  readonly document: PuppetDocument
  readonly motion?: PuppetMotion
  readonly selection: KeyframeSelection | null
}

export const deleteSelectedKeyframes = (options: EditSelectedKeyframesOptions) =>
  options.motion === undefined || options.selection === null
    ? undefined
    : deleteParameterKeyframes({
        document: options.document,
        motionId: options.motion.id,
        parameterId: options.selection.parameterId,
        times: options.selection.times,
      })

export interface EaseSelectedKeyframesOptions extends EditSelectedKeyframesOptions {
  readonly value: string
}

export const easeSelectedKeyframes = (options: EaseSelectedKeyframesOptions) => {
  const easing = PUPPET_EASINGS.find((candidate) => candidate === options.value)
  if (options.motion === undefined || options.selection === null || easing === undefined) {
    return undefined
  }
  const track = options.motion.tracks.find(
    (candidate) =>
      candidate.kind === 'parameter' && candidate.parameterId === options.selection?.parameterId,
  )
  const times = options.selection.times.filter((time) => {
    const index = track?.keyframes.findIndex((keyframe) => keyframe.time === time) ?? -1
    return index >= 0 && index < (track?.keyframes.length ?? 0) - 1
  })
  if (times.length === 0) {
    return undefined
  }
  return setParameterKeyframesEasing({
    document: options.document,
    easing,
    motionId: options.motion.id,
    parameterId: options.selection.parameterId,
    times,
  })
}
