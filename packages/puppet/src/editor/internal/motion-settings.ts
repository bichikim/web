import type {
  PuppetDocument,
  PuppetKeyframe,
  PuppetMotion,
  PuppetMotionEvent,
} from '../../player/document'
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

const clampEventTime = (motion: PuppetMotion) => (event: PuppetMotionEvent) => ({
  ...event,
  time: Math.min(motion.duration, Math.max(0, event.time)),
})

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
    // Events keep their order (playback sorts them), so editor rows never swap under the user.
    const events = mergedEvents?.map(clampEventTime(motion))
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

/** Changes the motion's event at `index` in place, so every editor row keeps its event. */
export const setMotionEvent = (
  document: PuppetDocument,
  motionId: string,
  index: number,
  change: Partial<PuppetMotionEvent>,
): PuppetDocument | undefined =>
  replaceMotion(document, motionId, (motion) => ({
    ...motion,
    events: (motion.events ?? []).map((event, at) =>
      at === index ? clampEventTime(motion)({...event, ...change}) : event,
    ),
  }))

/** The selected keyframe and the next one of its parameter track. */
const getSelectedSegment = (
  motion: PuppetMotion | undefined,
  selection: KeyframeSelection | null,
  document?: PuppetDocument,
) => {
  const track = motion?.tracks.find(
    (candidate) =>
      selection !== null &&
      selection !== undefined &&
      isTrackForRow(candidate, selection.parameterId, document),
  )
  const keyframes = track?.keyframes.toSorted((first, second) => first.time - second.time) ?? []
  const index = keyframes.findIndex((keyframe) => keyframe.time === selection?.time)
  const [keyframe, next] = [keyframes[index], keyframes[index + 1]]
  return keyframe === undefined || next === undefined ? undefined : {keyframe, next}
}

/**
 * 선택한 베지어 구간의 핸들. 생략된 핸들은 수평 기본값으로 반환하고, 베지어가 아니면 없다.
 * 문서를 주면 파라미터와 효과 행의 ID 충돌을 구분하며, 생략하면 기존 행 ID를 사용한다.
 */
export const getSelectedBezier = (
  motion: PuppetMotion | undefined,
  selection: KeyframeSelection | null,
  document?: PuppetDocument,
): Bezier | undefined => {
  const segment = getSelectedSegment(motion, selection, document)
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
  if (motion === undefined || getSelectedBezier(motion, selection, document) === undefined) {
    return undefined
  }
  const bezier: Bezier = [unit(handles[0]), handles[1], unit(handles[2]), handles[3]]
  return replaceMotion(document, motion.id, (current) => ({
    ...current,
    tracks: current.tracks.map((track) =>
      selection !== null &&
      selection !== undefined &&
      isTrackForRow(track, selection.parameterId, document)
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
