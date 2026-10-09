import type {PuppetMotion} from '../document'

export type MotionBlend = 'replace' | 'add'
export type MotionPlaybackStatus = 'playing' | 'paused' | 'finished' | 'stopped'

export interface MotionPlaybackOptions {
  readonly blend?: MotionBlend
  readonly loop?: boolean
  readonly onComplete?: () => void
  readonly priority?: number
  readonly speed?: number
  readonly weight?: number
}

export interface MotionPlaybackState {
  readonly duration: number
  readonly motionId: string
  readonly speed: number
  readonly status: MotionPlaybackStatus
  readonly time: number
  readonly weight: number
}

export interface MotionPlayback {
  getState(): MotionPlaybackState
  pause(): void
  resume(): void
  seek(time: number): void
  setSpeed(speed: number): void
  setWeight(weight: number): void
  stop(): void
}

export interface MotionFrame {
  readonly blend: MotionBlend
  readonly motion: PuppetMotion
  readonly priority: number
  readonly time: number
  readonly weight: number
}
