import type {PuppetMotion, PuppetMotionEvent} from '../document'
import {getMotionFadeOutTime, getPassedEvents} from './motion-fade'
import type {MotionEvent, MotionFrame, MotionPlaybackStatus} from './types'
import {validatePlaybackNumber} from './validate-playback-number'

interface CreateSelectedPlaybackOptions {
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly motionId?: string
  readonly onEvent?: (event: MotionEvent) => void
}

/** The previously selected motion, still playing while it fades out after a switch. */
interface OutgoingMotion {
  readonly loop: boolean
  readonly motion: PuppetMotion
  readonly remaining: number
  readonly speed: number
  readonly time: number
}

/** Motion time after `step` seconds, and whether it looped past the end. */
const stepTime = (motion: PuppetMotion, time: number, step: number, loop: boolean) => {
  const next = time + step
  const wraps = loop && motion.duration > 0
  return {
    time: wraps ? next % motion.duration : Math.min(next, motion.duration),
    wrapped: wraps && next >= motion.duration,
  }
}

interface SelectedPlaybackOptions {
  readonly loop?: boolean
  readonly onComplete?: () => void
  readonly speed?: number
}

interface SelectedPlaybackFrame {
  readonly duration: number
  readonly motionId: string | null
  readonly time: number
}

export type MotionSelection = 'changed' | 'missing' | 'unchanged'

export interface SelectedPlayback {
  advance(deltaTime: number): (() => void) | undefined
  frames(): ReadonlyArray<MotionFrame>
  getFrame(): SelectedPlaybackFrame
  isPlaying(): boolean
  pause(): void
  play(options?: SelectedPlaybackOptions): boolean
  playMotion(motionId: string, options?: SelectedPlaybackOptions): boolean
  resume(): void
  seek(time: number): void
  select(motionId: string): MotionSelection
  setSpeed(speed: number): void
  stop(): void
  update(motions: ReadonlyArray<PuppetMotion>): void
}

const getMotion = (motions: ReadonlyArray<PuppetMotion>, motionId: string | undefined) =>
  motionId === undefined ? motions[0] : motions.find((motion) => motion.id === motionId)

const getSeekTime = (motion: PuppetMotion | undefined, time: number) => {
  validatePlaybackNumber(time, 'Time', -Number.MAX_VALUE)
  const clamped = Math.max(0, time)
  return motion === undefined || motion.duration <= 0 ? clamped : Math.min(clamped, motion.duration)
}

const eventCallback =
  (
    onEvent: ((event: MotionEvent) => void) | undefined,
    motion: PuppetMotion,
    events: ReadonlyArray<PuppetMotionEvent>,
  ) =>
  () => {
    for (const event of events) {
      onEvent?.({motionId: motion.id, time: event.time, value: event.value})
    }
  }

/** The previously selected motion, playing on while it fades out after a switch. */
const createOutgoingMotion = (onEvent: ((event: MotionEvent) => void) | undefined) => {
  let outgoing: OutgoingMotion | undefined
  return {
    active: () => outgoing !== undefined,
    /** Advances it and returns the events it passed; drops it once faded out. */
    advance(deltaTime: number) {
      if (outgoing === undefined) {
        return undefined
      }
      const step = Math.max(0, deltaTime) * outgoing.speed
      const next = stepTime(outgoing.motion, outgoing.time, step, outgoing.loop)
      const events = eventCallback(
        onEvent,
        outgoing.motion,
        getPassedEvents(outgoing.motion, outgoing.time, next.time, next.wrapped),
      )
      const remaining = outgoing.remaining - step
      outgoing = remaining > 0 ? {...outgoing, remaining, time: next.time} : undefined
      return events
    },
    clear() {
      outgoing = undefined
    },
    frames(): ReadonlyArray<MotionFrame> {
      return outgoing === undefined
        ? []
        : [
            {
              blend: 'replace',
              motion: outgoing.motion,
              priority: 0,
              rate: outgoing.speed,
              remaining: outgoing.remaining,
              time: outgoing.time,
              weight: 1,
            },
          ]
    },
    /** Starts fading `current` out, if its motion has a fade-out time. */
    release(current: Omit<OutgoingMotion, 'remaining'>) {
      const remaining = getMotionFadeOutTime(current.motion)
      outgoing = remaining > 0 ? {...current, remaining} : undefined
    },
  }
}

/** The selected motion's frame; a non-looping one fades out before its end. */
const selectedFrame = (state: {
  readonly elapsed: number | undefined
  readonly loop: boolean
  readonly motion: PuppetMotion
  readonly rate: number
  readonly time: number
}): MotionFrame => ({
  blend: 'replace',
  elapsed: state.elapsed,
  motion: state.motion,
  priority: 0,
  rate: state.rate,
  remaining: state.loop ? undefined : state.motion.duration - state.time,
  time: state.time,
  weight: 1,
})

export const createSelectedPlayback = (
  options: CreateSelectedPlaybackOptions,
): SelectedPlayback => {
  let {motions} = options
  let motion = getMotion(motions, options.motionId)
  let status: MotionPlaybackStatus = 'playing'
  let loop = motion?.loop ?? true
  let speed = 1
  let time = 0
  let onComplete: (() => void) | undefined
  // Motion seconds since the selection started fading in; undefined when it started settled.
  let elapsed: number | undefined
  const outgoing = createOutgoingMotion(options.onEvent)
  const emit = eventCallback.bind(undefined, options.onEvent)
  return {
    advance(deltaTime) {
      const outgoingEvents = outgoing.advance(deltaTime)
      if (status !== 'playing' || motion === undefined || speed === 0) {
        return outgoingEvents
      }
      const step = deltaTime * speed
      const completed = !loop && time + step >= motion.duration
      const next = stepTime(motion, time, step, loop)
      const passed = emit(motion, getPassedEvents(motion, time, next.time, next.wrapped))
      const events = () => {
        outgoingEvents?.()
        passed()
      }
      ;({time} = next)
      elapsed = elapsed === undefined ? undefined : elapsed + step
      if (!completed) {
        return events
      }
      const completedMotion = motion
      const complete = onComplete
      status = 'finished'
      onComplete = undefined
      return () => {
        events()
        if (
          status !== 'stopped' &&
          motion === completedMotion &&
          time === completedMotion.duration
        ) {
          complete?.()
        }
      }
    },
    frames() {
      const previous = outgoing.frames()
      return motion === undefined || status === 'stopped'
        ? previous
        : [
            ...previous,
            selectedFrame({elapsed, loop, motion, rate: status === 'playing' ? speed : 0, time}),
          ]
    },
    getFrame() {
      const selected = status === 'stopped' ? undefined : motion
      return {duration: selected?.duration ?? 0, motionId: selected?.id ?? null, time}
    },
    // Without a motion nothing plays, so automatic effects that rest during motions keep running.
    isPlaying: () =>
      (status === 'playing' && speed > 0 && motion !== undefined) || outgoing.active(),
    pause() {
      if (status === 'playing') {
        status = 'paused'
      }
    },
    play(settings) {
      const nextSpeed = validatePlaybackNumber(settings?.speed ?? speed, 'Speed')
      const activating = status === 'stopped'
      if (activating) {
        elapsed = 0
      }
      status = 'playing'
      speed = nextSpeed
      loop = settings?.loop ?? motion?.loop ?? true
      onComplete = settings?.onComplete
      return activating
    },
    playMotion(motionId, settings = {}) {
      const nextMotion = getMotion(motions, motionId)
      if (nextMotion === undefined) {
        return false
      }
      const nextSpeed = validatePlaybackNumber(settings.speed ?? 1, 'Speed')
      if (motion !== undefined && status === 'playing') {
        outgoing.release({loop, motion, speed, time})
      }
      motion = nextMotion
      time = 0
      elapsed = 0
      loop = settings.loop ?? nextMotion.loop ?? true
      status = 'playing'
      speed = nextSpeed
      ;({onComplete} = settings)
      return true
    },
    resume() {
      if (status !== 'stopped') {
        status = 'playing'
      }
    },
    seek(nextTime) {
      time = getSeekTime(motion, nextTime)
      elapsed = undefined
      outgoing.clear()
    },
    select(motionId) {
      const nextMotion = getMotion(motions, motionId)
      if (nextMotion === undefined) {
        return 'missing'
      }
      if (status !== 'stopped' && motion?.id === nextMotion.id) {
        return 'unchanged'
      }
      motion = nextMotion
      if (status === 'stopped') {
        status = 'paused'
      }
      time = 0
      elapsed = undefined
      outgoing.clear()
      loop = nextMotion.loop ?? true
      onComplete = undefined
      return 'changed'
    },
    setSpeed(nextSpeed) {
      speed = validatePlaybackNumber(nextSpeed, 'Speed')
    },
    stop() {
      status = 'stopped'
      time = 0
      onComplete = undefined
      outgoing.clear()
    },
    update(nextMotions) {
      motions = nextMotions
      motion = getMotion(motions, motion?.id ?? options.motionId) ?? motions[0]
      loop = motion?.loop ?? true
      outgoing.clear()
      onComplete = undefined
      time = getSeekTime(motion, time)
    },
  }
}
