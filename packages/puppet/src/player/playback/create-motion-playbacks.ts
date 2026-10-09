import type {PuppetMotion} from '../document'
import type {
  MotionFrame,
  MotionPlayback,
  MotionPlaybackOptions,
  MotionPlaybackStatus,
} from './types'
import {validatePlaybackNumber} from './validate-playback-number'

interface Playback extends MotionFrame {
  readonly loop: boolean
  readonly onComplete?: () => void
  readonly speed: number
  readonly status: MotionPlaybackStatus
}

interface PlaybackEntry {
  playback: Playback
}

interface CreateMotionPlaybacksOptions {
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly onChange: () => void
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

const advancePlayback = (playback: Playback, deltaTime: number): Playback => {
  const next = playback.time + Math.max(0, deltaTime) * playback.speed
  const finished = !playback.loop && next >= playback.motion.duration
  const time =
    playback.loop && playback.motion.duration > 0
      ? next % playback.motion.duration
      : Math.min(next, playback.motion.duration)
  return {...playback, status: finished ? 'finished' : 'playing', time}
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
      loop: settings.loop ?? true,
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
    return {
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
          change(id, {status: 'paused'})
        }
      },
      resume() {
        if (current().status === 'paused') {
          change(id, {status: 'playing'})
        }
      },
      seek(time) {
        validatePlaybackNumber(time, 'Time', -Number.MAX_VALUE)
        const playback = current()
        const bounded = Math.min(playback.motion.duration, Math.max(0, time))
        change(id, {
          status:
            playback.status === 'finished' && bounded < playback.motion.duration
              ? 'paused'
              : playback.status,
          time: bounded,
        })
      },
      setSpeed(speed) {
        change(id, {speed: validatePlaybackNumber(speed, 'Speed')})
      },
      setWeight(weight) {
        change(id, {weight: validatePlaybackNumber(weight, 'Weight')})
      },
      stop,
    }
  }
  const advance = (deltaTime: number): ReadonlyArray<() => void> => {
    const callbacks: Array<() => void> = []
    for (const [id, entry] of playbacks) {
      const {playback} = entry
      if (playback.status === 'playing' && playback.speed > 0) {
        const nextPlayback = advancePlayback(playback, deltaTime)
        entry.playback = nextPlayback
        if (nextPlayback.status === 'finished' && playback.onComplete !== undefined) {
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
      [...playbacks.values()].map((entry) => entry.playback),
    isPlaying: () =>
      [...playbacks.values()].some(
        ({playback}) => playback.status === 'playing' && playback.speed > 0,
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
