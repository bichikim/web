import type {PuppetMotion} from '../document'
import type {MotionFrame, MotionPlaybackStatus} from './types'
import {validatePlaybackNumber} from './validate-playback-number'

interface CreateSelectedPlaybackOptions {
  readonly motions: ReadonlyArray<PuppetMotion>
  readonly motionId?: string
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

export const createSelectedPlayback = (
  options: CreateSelectedPlaybackOptions,
): SelectedPlayback => {
  let {motions} = options
  let motion = getMotion(motions, options.motionId)
  let status: MotionPlaybackStatus = 'playing'
  let loop = true
  let speed = 1
  let time = 0
  let onComplete: (() => void) | undefined
  return {
    advance(deltaTime) {
      if (status !== 'playing' || motion === undefined || speed === 0) {
        return undefined
      }
      const nextTime = time + deltaTime * speed
      const completed = !loop && nextTime >= motion.duration
      time =
        loop && motion.duration > 0
          ? nextTime % motion.duration
          : Math.min(nextTime, motion.duration)
      if (!completed) {
        return undefined
      }
      const completedMotion = motion
      const complete = onComplete
      status = 'finished'
      onComplete = undefined
      return () => {
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
      return motion === undefined || status === 'stopped'
        ? []
        : [{blend: 'replace', motion, priority: 0, time, weight: 1}]
    },
    getFrame() {
      const selected = status === 'stopped' ? undefined : motion
      return {duration: selected?.duration ?? 0, motionId: selected?.id ?? null, time}
    },
    isPlaying: () => status === 'playing' && speed > 0,
    pause() {
      if (status === 'playing') {
        status = 'paused'
      }
    },
    play(settings) {
      const nextSpeed = validatePlaybackNumber(settings?.speed ?? speed, 'Speed')
      const activating = status === 'stopped'
      status = 'playing'
      speed = nextSpeed
      loop = settings?.loop ?? true
      onComplete = settings?.onComplete
      return activating
    },
    playMotion(motionId, settings = {}) {
      const nextMotion = getMotion(motions, motionId)
      if (nextMotion === undefined) {
        return false
      }
      const nextSpeed = validatePlaybackNumber(settings.speed ?? 1, 'Speed')
      motion = nextMotion
      time = 0
      loop = settings.loop ?? true
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
      loop = true
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
    },
    update(nextMotions) {
      motions = nextMotions
      motion = getMotion(motions, motion?.id ?? options.motionId) ?? motions[0]
      loop = true
      onComplete = undefined
      time = getSeekTime(motion, time)
    },
  }
}
