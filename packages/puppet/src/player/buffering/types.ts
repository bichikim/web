import type {PuppetSound} from '../audio/decode-wav'
import type {PuppetDocument} from '../document'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {ComputedRenderFrame} from '../internal/compute-render-frame'
import type {AdditionalPlaybackState} from '../playback/types'
import type {PlayerFrame} from '../player-types'

export const PLAYER_BUFFER_FRAMES = 3

export type PlayerBufferingStatus =
  | 'disabled'
  | 'preparing'
  | 'active'
  | 'idle'
  | 'unsupported'
  | 'error'
  | 'destroyed'
export interface PlayerBufferingInfo {
  readonly enabled: boolean
  readonly status: PlayerBufferingStatus
  readonly framesAhead: number
}
export interface PlayerBufferingConfiguration {
  /** Enables at most three predicted frames; false applies pending controls through the native path. */
  readonly enabled: boolean
}
export type PlayerBufferingChange = 'applied' | 'superseded' | 'destroyed' | 'unavailable'
export interface BufferFrame {
  readonly inputRevision: number
  readonly playback: PlayerFrame
  readonly kind: 'frame'
  readonly generation: number
  readonly time: number
  readonly deltaTime: number
  readonly computed: ComputedRenderFrame
  readonly state: PlayerRuntimeState
}
export interface StaleBufferFrame {
  readonly kind: 'stale'
  readonly generation: number
  readonly buffer: ArrayBuffer
}
export interface ProduceBufferFrame {
  readonly acknowledgedNotices?: number
  readonly input?: BufferedInput
  readonly buffer: ArrayBuffer
  readonly deltaTime: number
  readonly generation: number
  readonly time: number
}
export type BufferRequest =
  | {
      readonly id: number
      readonly kind: 'initialize'
      readonly document: PuppetDocument
      readonly audio: ReadonlyMap<string, PuppetSound>
    }
  | {
      readonly id: number
      readonly kind: 'audio'
      readonly sounds: ReadonlyMap<string, PuppetSound>
      readonly removed: ReadonlyArray<string>
    }
  | {
      readonly id: number
      readonly kind: 'reset'
      readonly generation: number
      readonly inputRevision: number
      readonly state: PlayerRuntimeState
    }
  | {readonly id: number; readonly kind: 'produce'; readonly request: ProduceBufferFrame}
export type BufferResponse =
  | {readonly id: number; readonly kind: 'initialized'; readonly bytes: number}
  | {readonly id: number; readonly kind: 'reset'}
  | {readonly id: number; readonly kind: 'audio'}
  | {readonly id: number; readonly kind: 'produced'; readonly frame: BufferFrame | StaleBufferFrame}
  | {readonly id: number; readonly kind: 'error'; readonly message: string}
export interface BufferWorker {
  initialize(document: PuppetDocument, audio?: ReadonlyMap<string, PuppetSound>): Promise<number>
  updateAudio(sounds: ReadonlyMap<string, PuppetSound>): Promise<void>
  reset(state: PlayerRuntimeState, generation: number, inputRevision?: number): Promise<void>
  produce(request: ProduceBufferFrame): Promise<BufferFrame | StaleBufferFrame>
  destroy(): void
}

/** Borrowed host scheduling capabilities; each session cancels only its own frame requests. */
export interface BufferScheduler {
  /** Cancels the pending frame request identified by its returned handle. */
  cancelFrame(handle: number): void
  /** Finite current time in milliseconds, using one consistent epoch throughout the session. */
  now(): number
  /** Runs after the current task, reporting callback exceptions to the host. */
  queueMicrotask(callback: () => void): void
  /** Defers one display-refresh callback; returns a handle unique among pending requests. */
  requestFrame(callback: () => void): number
}

/** Controls may change on the host; integrated simulation remains owned by the Worker. */
export type RuntimeInputs = Omit<
  PlayerRuntimeState,
  'chainState' | 'frameValues' | 'history' | 'notices' | 'physicsState' | 'poseState'
>
export interface RuntimeInputPatch extends Partial<
  Omit<RuntimeInputs, 'additional' | 'look' | 'playback'>
> {
  /** An explicit history reset replaces the retained history; omitted, keep Worker integration. */
  readonly history?: PlayerRuntimeState['history']
  readonly additional?: Readonly<Record<string, Partial<AdditionalPlaybackState> | null>>
  readonly look?: Partial<RuntimeInputs['look']>
  readonly playback?: Partial<RuntimeInputs['playback']>
}
export interface BufferedInput {
  readonly revision: number
  readonly state: PlayerRuntimeState
  readonly settle: boolean
}
export type PlayerInputChange = 'applied' | 'superseded' | 'destroyed' | 'unavailable'
