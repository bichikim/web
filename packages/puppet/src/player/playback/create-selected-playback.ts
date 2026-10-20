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
  /** Motion seconds since it started fading in; undefined when it started settled. */
  readonly elapsed: number | undefined
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
    wraps: wraps ? Math.floor(next / motion.duration) : 0,
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

/**
 * Advances an outgoing motion by `deltaTime` seconds; `undefined` once it faded out. A motion
 * frozen at speed 0 holds its pose and fades out over real time instead of never.
 */
const advanceOutgoing = (outgoing: OutgoingMotion, deltaTime: number) => {
  const step = deltaTime * outgoing.speed
  const next = stepTime(outgoing.motion, outgoing.time, step, outgoing.loop)
  const remaining = outgoing.remaining - (outgoing.speed > 0 ? step : deltaTime)
  return {
    next:
      remaining > 0
        ? {
            ...outgoing,
            elapsed: outgoing.elapsed === undefined ? undefined : outgoing.elapsed + step,
            remaining,
            time: next.time,
          }
        : undefined,
    passed: getPassedEvents(outgoing.motion, outgoing.time, next.time, next.wraps),
  }
}

/**
 * Previously selected motions, playing on while they fade out after switches. Each keeps its
 * fade-in and ends no later than it would have on its own (Cubism keeps every fading entry).
 */
const createOutgoingMotions = (onEvent: ((event: MotionEvent) => void) | undefined) => {
  let outgoing: ReadonlyArray<OutgoingMotion> = []
  return {
    active: () => outgoing.length > 0,
    /** Advances them and returns the events they passed; drops those faded out. */
    advance(deltaTime: number) {
      if (outgoing.length === 0) {
        return undefined
      }
      const advanced = outgoing.map((motion) => ({
        motion,
        ...advanceOutgoing(motion, Math.max(0, deltaTime)),
      }))
      outgoing = advanced.flatMap(({next}) => next ?? [])
      const events = advanced.map(({motion, passed}) =>
        eventCallback(onEvent, motion.motion, passed),
      )
      return () => {
        for (const emit of events) {
          emit()
        }
      }
    },
    clear() {
      outgoing = []
    },
    /** Their frames; a paused player holds them still (rate 0, so their sounds stop too). */
    frames: (paused: boolean): ReadonlyArray<MotionFrame> =>
      outgoing.map((motion) => ({
        blend: 'replace',
        elapsed: motion.elapsed,
        motion: motion.motion,
        priority: 0,
        rate: paused ? 0 : motion.speed,
        remaining: motion.remaining,
        time: motion.time,
        weight: 1,
      })),
    /** Starts fading `current` out, if its motion has a fade-out time left. */
    release(current: Omit<OutgoingMotion, 'remaining'>) {
      const left = current.loop ? Number.POSITIVE_INFINITY : current.motion.duration - current.time
      const remaining = Math.min(getMotionFadeOutTime(current.motion), left)
      if (remaining > 0) {
        outgoing = [...outgoing, {...current, remaining}]
      }
    },
  }
}

/**
 * The selected motion's frame, unless none is selected or it stopped. A non-looping one fades
 * out before its end, except at a time reached by seeking or selecting until playback resumes
 * (like the fade-in, which a seek skips).
 */
const selectedFrames = (state: {
  readonly elapsed: number | undefined
  readonly loop: boolean
  readonly motion: PuppetMotion | undefined
  readonly scrubbed: boolean
  readonly speed: number
  readonly status: MotionPlaybackStatus
  readonly time: number
}): ReadonlyArray<MotionFrame> =>
  state.motion === undefined || state.status === 'stopped'
    ? []
    : [
        {
          blend: 'replace',
          elapsed: state.elapsed,
          motion: state.motion,
          priority: 0,
          rate: state.status === 'playing' ? state.speed : 0,
          remaining: state.loop || state.scrubbed ? undefined : state.motion.duration - state.time,
          time: state.time,
          weight: 1,
        },
      ]

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
  // A time reached by seeking or selecting shows without fades until playback resumes.
  let scrubbed = false
  // A pause also holds the fading motions, even once a one-shot selection finished.
  let held = false
  const outgoing = createOutgoingMotions(options.onEvent)
  const emit = eventCallback.bind(undefined, options.onEvent)
  return {
    advance(deltaTime) {
      // Pausing holds the fading motions too.
      const outgoingEvents = held ? undefined : outgoing.advance(deltaTime)
      if (status !== 'playing' || motion === undefined || speed === 0) {
        return outgoingEvents
      }
      const step = deltaTime * speed
      // Once time passes again the motion fades as usual, even after a seek while playing.
      scrubbed &&= step <= 0
      const completed = !loop && time + step >= motion.duration
      const next = stepTime(motion, time, step, loop)
      const passed = emit(motion, getPassedEvents(motion, time, next.time, next.wraps))
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
    frames: () => [
      ...outgoing.frames(held),
      ...selectedFrames({elapsed, loop, motion, scrubbed, speed, status, time}),
    ],
    getFrame() {
      const selected = status === 'stopped' ? undefined : motion
      return {duration: selected?.duration ?? 0, motionId: selected?.id ?? null, time}
    },
    // Without a motion nothing plays, so automatic effects that rest during motions keep running.
    isPlaying: () =>
      (status === 'playing' && speed > 0 && motion !== undefined) || (!held && outgoing.active()),
    pause() {
      held = status !== 'stopped'
      status = status === 'playing' ? 'paused' : status
    },
    play(settings) {
      const nextSpeed = validatePlaybackNumber(settings?.speed ?? speed, 'Speed')
      const activating = status === 'stopped'
      if (activating) {
        elapsed = 0
      }
      status = 'playing'
      held = false
      scrubbed = false
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
        outgoing.release({elapsed, loop, motion, speed, time})
      }
      motion = nextMotion
      time = 0
      elapsed = 0
      loop = settings.loop ?? nextMotion.loop ?? true
      status = 'playing'
      held = false
      scrubbed = false
      speed = nextSpeed
      ;({onComplete} = settings)
      return true
    },
    resume() {
      if (status !== 'stopped') {
        status = 'playing'
        held = false
        scrubbed = false
      }
    },
    seek(nextTime) {
      time = getSeekTime(motion, nextTime)
      elapsed = undefined
      scrubbed = true
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
      scrubbed = true
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
