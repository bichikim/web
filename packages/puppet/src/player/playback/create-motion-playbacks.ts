import type {PuppetMotion} from '../document'
import {getMotionFadeOutTime, getPassedEvents} from './motion-fade'
import type {
  MotionEvent,
  MotionFrame,
  MotionPlayback,
  MotionPlaybackOptions,
  MotionPlaybackStatus,
} from './types'
import {validatePlaybackNumber} from './validate-playback-number'

interface Playback extends MotionFrame {
  readonly elapsed: number
  readonly loop: boolean
  readonly onComplete?: () => void
  readonly speed: number
  readonly status: MotionPlaybackStatus
  /** Motion seconds left of a requested fade-out. */
  readonly stopping?: number
}

interface PlaybackEntry {
  playback: Playback
}

interface CreateMotionPlaybacksOptions {
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly onChange: () => void
  readonly onEvent?: (event: MotionEvent) => void
}

export interface MotionPlaybacks {
  advance(deltaTime: number): ReadonlyArray<() => void>
  frames(): ReadonlyArray<MotionFrame>
  isPlaying(): boolean
  pause(): void
  resume(): void
  start(motionId: string, settings?: MotionPlaybackOptions): MotionPlayback | undefined
  stop(): void
  update(motions: ReadonlyArray<PuppetMotion>): void
}

const advancePlayback = (playback: Playback, deltaTime: number) => {
  const step = Math.max(0, deltaTime) * playback.speed
  const next = playback.time + step
  const finished = !playback.loop && next >= playback.motion.duration
  const wraps =
    playback.loop && playback.motion.duration > 0 ? Math.floor(next / playback.motion.duration) : 0
  const time =
    playback.loop && playback.motion.duration > 0
      ? next % playback.motion.duration
      : Math.min(next, playback.motion.duration)
  return {
    events: getPassedEvents(playback.motion, playback.time, time, wraps),
    playback: {
      ...playback,
      elapsed: playback.elapsed + step,
      status: finished ? ('finished' as const) : ('playing' as const),
      stopping:
        playback.stopping === undefined
          ? undefined
          : playback.stopping - (playback.speed > 0 ? step : Math.max(0, deltaTime)),
      time,
    },
  }
}

/** Seconds until the playback ends: a requested fade-out, or a non-looping motion's end. */
const getRemaining = (playback: Playback) => {
  const end = playback.loop ? undefined : playback.motion.duration - playback.time
  return end === undefined || playback.stopping === undefined
    ? (end ?? playback.stopping)
    : Math.min(end, playback.stopping)
}

interface PlaybackHandleContext {
  readonly change: (update: Partial<Playback>) => void
  readonly current: () => Playback
  readonly motionId: string
  readonly stop: () => void
}

const createPlaybackHandle = ({
  change,
  current,
  motionId,
  stop,
}: PlaybackHandleContext): MotionPlayback => {
  return {
    fadeOut() {
      const fadeOutTime = getMotionFadeOutTime(current().motion)
      if (fadeOutTime <= 0) {
        stop()
      } else if (current().stopping === undefined) {
        change({stopping: fadeOutTime})
      }
    },
    getState() {
      const playback = current()
      return {
        duration: playback.motion.duration,
        motionId,
        speed: playback.speed,
        status: playback.status,
        time: playback.time,
        weight: playback.weight,
      }
    },
    pause() {
      if (current().status === 'playing') {
        change({status: 'paused'})
      }
    },
    resume() {
      if (current().status === 'paused') {
        change({status: 'playing'})
      }
    },
    seek(time) {
      validatePlaybackNumber(time, 'Time', -Number.MAX_VALUE)
      const playback = current()
      const bounded = Math.min(playback.motion.duration, Math.max(0, time))
      change({
        status:
          playback.status === 'finished' && bounded < playback.motion.duration
            ? 'paused'
            : playback.status,
        time: bounded,
      })
    },
    setSpeed(speed) {
      change({speed: validatePlaybackNumber(speed, 'Speed')})
    },
    setWeight(weight) {
      change({weight: validatePlaybackNumber(weight, 'Weight')})
    },
    stop,
  }
}

export const createMotionPlaybacks = (options: CreateMotionPlaybacksOptions): MotionPlaybacks => {
  let {motions} = options
  const playbacks = new Map<symbol, PlaybackEntry>()
  const change = (id: symbol, update: Partial<Playback>) => {
    const entry = playbacks.get(id)
    if (entry !== undefined) {
      entry.playback = {...entry.playback, ...update}
      options.onChange()
    }
  }
  const start = (
    motionId: string,
    settings: MotionPlaybackOptions = {},
  ): MotionPlayback | undefined => {
    const motion = motions.find((candidate) => candidate.id === motionId)
    if (motion === undefined) {
      return undefined
    }
    const playback: Playback = {
      blend: settings.blend ?? 'replace',
      elapsed: 0,
      loop: settings.loop ?? motion.loop ?? true,
      motion,
      onComplete: settings.onComplete,
      priority: validatePlaybackNumber(settings.priority ?? 1, 'Priority', -Number.MAX_VALUE),
      speed: validatePlaybackNumber(settings.speed ?? 1, 'Speed'),
      status: 'playing',
      time: 0,
      weight: validatePlaybackNumber(settings.weight ?? 1, 'Weight'),
    }
    const id = Symbol(motionId)
    const entry: PlaybackEntry = {playback}
    const current = () => entry.playback
    const stop = () => {
      entry.playback = {...current(), onComplete: undefined, status: 'stopped'}
      if (playbacks.delete(id)) {
        options.onChange()
      }
    }
    playbacks.set(id, entry)
    options.onChange()
    return createPlaybackHandle({change: (update) => change(id, update), current, motionId, stop})
  }
  const advance = (deltaTime: number): ReadonlyArray<() => void> => {
    const callbacks: Array<() => void> = []
    for (const [id, entry] of playbacks) {
      const {playback} = entry
      if (
        playback.status === 'playing' &&
        (playback.speed > 0 || playback.stopping !== undefined)
      ) {
        const {events, playback: nextPlayback} = advancePlayback(playback, deltaTime)
        entry.playback = nextPlayback
        for (const event of events) {
          callbacks.push(() =>
            options.onEvent?.({motionId: playback.motion.id, time: event.time, value: event.value}),
          )
        }
        if (nextPlayback.stopping !== undefined && nextPlayback.stopping <= 0) {
          entry.playback = {...nextPlayback, onComplete: undefined, status: 'stopped'}
          playbacks.delete(id)
        } else if (nextPlayback.status === 'finished' && playback.onComplete !== undefined) {
          callbacks.push(() => {
            const current = entry.playback
            if (
              playbacks.get(id) === entry &&
              current.status === 'finished' &&
              current.time >= current.motion.duration
            ) {
              playback.onComplete?.()
            }
          })
        }
      }
    }
    return callbacks
  }
  const update = (nextMotions: ReadonlyArray<PuppetMotion>) => {
    motions = nextMotions
    for (const [id, entry] of playbacks) {
      const {playback} = entry
      const motion = motions.find((candidate) => candidate.id === playback.motion.id)
      if (motion === undefined) {
        entry.playback = {...playback, onComplete: undefined, status: 'stopped'}
        playbacks.delete(id)
      } else {
        entry.playback = {...playback, motion, time: Math.min(playback.time, motion.duration)}
      }
    }
  }
  const setStatus = (from: MotionPlaybackStatus, to: MotionPlaybackStatus) => {
    for (const entry of playbacks.values()) {
      const {playback} = entry
      if (playback.status === from) {
        entry.playback = {...playback, status: to}
      }
    }
  }
  return {
    advance,
    frames: (): ReadonlyArray<MotionFrame> =>
      [...playbacks.values()].map(({playback}) => ({
        ...playback,
        rate: playback.status === 'playing' ? playback.speed : 0,
        remaining: getRemaining(playback),
      })),
    isPlaying: () =>
      [...playbacks.values()].some(
        ({playback}) =>
          playback.status === 'playing' && (playback.speed > 0 || playback.stopping !== undefined),
      ),
    pause: () => setStatus('playing', 'paused'),
    resume: () => setStatus('paused', 'playing'),
    start,
    stop: () => {
      for (const entry of playbacks.values()) {
        entry.playback = {...entry.playback, onComplete: undefined, status: 'stopped'}
      }
      playbacks.clear()
    },
    update,
  }
}
