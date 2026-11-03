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
  /** Stable identity within this player, including across Worker checkpoints. */
  readonly id: number
  /** Fades the playback out over the motion's fade-out time, then stops it. */
  fadeOut(): void
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
  /** Motion seconds since the playback started; omitted when it started without fading in. */
  readonly elapsed?: number
  readonly motion: PuppetMotion
  readonly priority: number
  /** Motion seconds per second while it advances; 0 or omitted while paused or finished. */
  readonly rate?: number
  /** Motion seconds until the playback ends; omitted while it is not ending. */
  readonly remaining?: number
  readonly time: number
  readonly weight: number
}

/** An event of a playing motion, reported once playback passes its time. */
export interface MotionEvent {
  readonly motionId: string
  readonly time: number
  readonly value: string
}

/** Serializable selected playback state; callbacks remain with the host player. */
export interface SelectedPlaybackState {
  readonly completion: number | undefined
  readonly elapsed: number | undefined
  readonly held: boolean
  readonly loop: boolean
  readonly motionId: string | undefined
  readonly outgoing: ReadonlyArray<OutgoingPlaybackState>
  readonly scrubbed: boolean
  readonly speed: number
  readonly status: MotionPlaybackStatus
  readonly time: number
}

export interface OutgoingPlaybackState {
  readonly elapsed: number | undefined
  readonly loop: boolean
  readonly motionId: string
  readonly remaining: number
  readonly speed: number
  readonly time: number
}

export interface SerializedMotionFrame extends Omit<MotionFrame, 'motion'> {
  readonly motionId: string
}

/** Independent motion state transferred without callbacks or document object identities. */
export interface AdditionalPlaybackState extends Omit<
  MotionFrame,
  'motion' | 'rate' | 'remaining'
> {
  readonly id: number
  readonly motionId: string
  readonly elapsed: number
  readonly loop: boolean
  readonly speed: number
  readonly status: MotionPlaybackStatus
  readonly stopping: number | undefined
  readonly completion: number | undefined
}

/** Numerical completion token; callback functions remain with the presenting host. */
export interface RuntimePlaybackOptions extends MotionPlaybackOptions {
  /** Host-owned callback identity; omitted, do not emit completion tokens. */
  readonly completion?: number
}
