import type {ParameterTimelineKeyframe} from './timeline-keyframe-selection'

export interface TimelineKeyframeView {
  readonly key: number
  readonly keyframe: ParameterTimelineKeyframe
}

export interface ReconcileTimelineKeyframesOptions {
  readonly previous: ReadonlyArray<TimelineKeyframeView>
  readonly keyframes: ReadonlyArray<ParameterTimelineKeyframe>
  readonly moves?: ReadonlyArray<TimelineKeyframeMove>
}

export interface TimelineKeyframeMove {
  readonly sourceTime: number
  readonly targetTime: number
}

const getTimeSlots = (times: ReadonlyArray<number>) => {
  const occurrences = new Map<number, number>()
  return times.map((time) => {
    const occurrence = occurrences.get(time) ?? 0
    occurrences.set(time, occurrence + 1)
    return `${time}:${occurrence}`
  })
}

export const reconcileTimelineKeyframes = (
  options: ReconcileTimelineKeyframesOptions,
): ReadonlyArray<TimelineKeyframeView> => {
  const moves = new Map(options.moves?.map((move) => [move.sourceTime, move.targetTime]))
  const previousSlots = getTimeSlots(
    options.previous.map((view) => moves.get(view.keyframe.time) ?? view.keyframe.time),
  )
  const slots = getTimeSlots(options.keyframes.map((keyframe) => keyframe.time))
  const previousByTime = new Map(
    options.previous.map((view, index) => [previousSlots[index]!, view]),
  )
  const nextSlots = new Set(slots)
  const removed = options.previous.filter((_, index) => !nextSlots.has(previousSlots[index]!))
  const inserted = slots.filter((slot) => !previousByTime.has(slot))
  const moved =
    removed.length === inserted.length
      ? new Map(inserted.map((slot, index) => [slot, removed[index]!.key]))
      : new Map<string, number>()
  let nextKey = Math.max(-1, ...options.previous.map((view) => view.key)) + 1
  return options.keyframes.map((keyframe, index) => {
    const slot = slots[index]!
    const existing = previousByTime.get(slot)?.key ?? moved.get(slot)
    if (existing !== undefined) {
      return {key: existing, keyframe}
    }
    const key = nextKey
    nextKey += 1
    return {key, keyframe}
  })
}
