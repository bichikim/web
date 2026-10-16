import type {PuppetDocument, PuppetKeyframe, PuppetMotion} from '../../player/document'
import type {KeyframeSelection} from './timeline-keyframe-selection'
import {isTrackForRow} from '../../player/timeline-rows'

export type MotionSettings = Pick<
  PuppetMotion,
  'events' | 'fadeInTime' | 'fadeOutTime' | 'group' | 'loop' | 'name' | 'sound'
>

type Bezier = NonNullable<PuppetKeyframe['bezier']>

const SEGMENT_THIRDS = 3
const ONE_THIRD = 1 / SEGMENT_THIRDS
const TWO_THIRDS = 2 / SEGMENT_THIRDS

const unit = (value: number) => Math.min(1, Math.max(0, value))

const replaceMotion = (
  document: PuppetDocument,
  motionId: string,
  update: (motion: PuppetMotion) => PuppetMotion,
): PuppetDocument | undefined =>
  document.motions.some((motion) => motion.id === motionId)
    ? {
        ...document,
        motions: document.motions.map((motion) =>
          motion.id === motionId ? update(motion) : motion,
        ),
      }
    : undefined

/**
 * Merges `changes` into a motion's settings. Values set to `undefined`, empty names and groups,
 * and empty event lists are removed; events are kept in time order within the motion.
 */
export const setMotionSettings = (
  document: PuppetDocument,
  motionId: string,
  changes: MotionSettings,
): PuppetDocument | undefined =>
  replaceMotion(document, motionId, (motion) => {
    const {
      events: mergedEvents,
      group: mergedGroup,
      name: mergedName,
      sound,
      ...rest
    } = {...motion, ...changes}
    const events = mergedEvents
      ?.map((event) => ({...event, time: Math.min(motion.duration, Math.max(0, event.time))}))
      .toSorted((first, second) => first.time - second.time)
    const name = mergedName?.trim()
    const group = mergedGroup?.trim()
    return {
      ...rest,
      ...(group === undefined || group.length === 0 ? {} : {group}),
      ...(events === undefined || events.length === 0 ? {} : {events}),
      ...(name === undefined || name.length === 0 ? {} : {name}),
      ...(sound === undefined ? {} : {sound}),
    }
  })

/** The selected keyframe and the next one of its parameter track. */
const getSelectedSegment = (
  motion: PuppetMotion | undefined,
  selection: KeyframeSelection | null,
) => {
  const track = motion?.tracks.find(
    (candidate) =>
      selection !== null &&
      selection !== undefined &&
      isTrackForRow(candidate, selection.parameterId),
  )
  const keyframes = track?.keyframes.toSorted((first, second) => first.time - second.time) ?? []
  const index = keyframes.findIndex((keyframe) => keyframe.time === selection?.time)
  const [keyframe, next] = [keyframes[index], keyframes[index + 1]]
  return keyframe === undefined || next === undefined ? undefined : {keyframe, next}
}

/**
 * Handles of the selected keyframe's `bezier` segment: the stored ones, or the flat default
 * handles at one third from each end. `undefined` unless the segment is a Bezier.
 */
export const getSelectedBezier = (
  motion: PuppetMotion | undefined,
  selection: KeyframeSelection | null,
): Bezier | undefined => {
  const segment = getSelectedSegment(motion, selection)
  return segment?.keyframe.easing === 'bezier'
    ? (segment.keyframe.bezier ?? [
        ONE_THIRD,
        segment.keyframe.value,
        TWO_THIRDS,
        segment.next.value,
      ])
    : undefined
}

/** Stores Bezier handles on the selected keyframe; handle times are limited to 0..1. */
export const setSelectedBezier = (
  document: PuppetDocument,
  motion: PuppetMotion | undefined,
  selection: KeyframeSelection | null,
  handles: Bezier,
): PuppetDocument | undefined => {
  if (motion === undefined || getSelectedBezier(motion, selection) === undefined) {
    return undefined
  }
  const bezier: Bezier = [unit(handles[0]), handles[1], unit(handles[2]), handles[3]]
  return replaceMotion(document, motion.id, (current) => ({
    ...current,
    tracks: current.tracks.map((track) =>
      selection !== null && selection !== undefined && isTrackForRow(track, selection.parameterId)
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.time === selection.time ? {...keyframe, bezier} : keyframe,
            ),
          }
        : track,
    ),
  }))
}
