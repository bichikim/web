import type {PuppetMotion, PuppetMotionEvent, PuppetTrack} from '../document'
import type {MotionFrame} from './types'

const HALF = 0.5

/** Cubism's `GetEasingSine`: `0.5 − 0.5 cos(πt)` for `t` limited to 0..1. */
export const easeSine = (progress: number) =>
  HALF - HALF * Math.cos(Math.PI * Math.min(1, Math.max(0, progress)))

const fadeFactor = (seconds: number | undefined, duration: number) =>
  seconds === undefined || duration <= 0 ? 1 : easeSine(seconds / duration)

/**
 * The weight factor of `track` in `frame`: eased in over the track's (or else the motion's)
 * fade-in time since the playback started, and out over its fade-out time before it ends.
 */
export const getTrackFadeWeight = (frame: MotionFrame, track: PuppetTrack) =>
  fadeFactor(frame.elapsed, track.fadeInTime ?? frame.motion.fadeInTime ?? 0) *
  fadeFactor(frame.remaining, track.fadeOutTime ?? frame.motion.fadeOutTime ?? 0)

/** Seconds a stopped or replaced motion keeps playing while it fades out. */
export const getMotionFadeOutTime = (motion: PuppetMotion) => motion.fadeOutTime ?? 0

/**
 * 한 번의 갱신에서 이벤트를 모두 보고하는 반복 수 상한이다. 아주 큰 재생 속도로 멈췄던 프레임을
 * 따라잡을 때 이벤트 목록이 끝없이 커지지 않게 한다. Rust 런타임의 `MAX_EVENT_LOOPS`와 같다.
 */
export const MAX_EVENT_LOOPS = 1024

/**
 * `from < time <= to`를 지난 이벤트를 시간순으로 반환한다. `wraps`는 그 사이에 지난 반복
 * 경계 수이며, 완전히 지난 반복의 이벤트는 `MAX_EVENT_LOOPS`번까지 반환한다.
 */
export const getPassedEvents = (
  motion: PuppetMotion,
  from: number,
  to: number,
  wraps: number,
): ReadonlyArray<PuppetMotionEvent> => {
  const events = (motion.events ?? []).toSorted((first, second) => first.time - second.time)
  if (events.length === 0) {
    return []
  }
  const within = (start: number, end: number) =>
    events.filter((event) => event.time > start && event.time <= end)
  return wraps > 0
    ? [
        ...within(from, motion.duration),
        ...Array.from({length: Math.min(wraps - 1, MAX_EVENT_LOOPS)}, () =>
          within(0, motion.duration),
        ).flat(),
        ...within(0, to),
      ]
    : within(from, to)
}
