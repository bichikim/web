import type {GeometryEndpoint} from '../geometry/types'
import type {PuppetSound} from '../audio/decode-wav'
import type {PuppetDocument} from '../document'
import type {PlayerRuntimeState} from '../player-runtime-types'
import type {ComputedRenderFrame} from '../internal/compute-render-frame'
import type {AdditionalPlaybackState} from '../playback/types'
import type {PlayerFrame} from '../player-types'
import type {PackedRenderFrame} from './render-frame/types'

export type PlayerWorkerRuntime = 'javascript' | 'rust'

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
  /** Explicitly selected Worker runtime while active or idle; omitted when unavailable or unspecified. */
  readonly workerRuntime?: PlayerWorkerRuntime
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
export interface PackedComputedFrame extends Omit<ComputedRenderFrame, 'frame'> {
  readonly frame: PackedRenderFrame
}
export interface PackedBufferFrame extends Omit<BufferFrame, 'computed'> {
  readonly computed: PackedComputedFrame
}
export interface ProduceBufferFrame {
  readonly acknowledgedNotices?: number
  readonly input?: BufferedInput
  readonly buffer: ArrayBuffer
  readonly deltaTime: number
  readonly generation: number
  readonly time: number
  readonly renderGeometryOnly?: boolean
}
export interface InitializeBufferRequest {
  readonly id: number
  readonly kind: 'initialize'
  readonly geometry?: GeometryEndpoint
  readonly deferGeometry?: boolean
  readonly document: PuppetDocument
  readonly audio: ReadonlyMap<string, PuppetSound>
}
export interface InitializeRuntimeSectionRequest {
  readonly id: number
  readonly kind: 'initialize-section'
  readonly geometry?: GeometryEndpoint
  readonly partCount: number
  readonly runtimeSection: Blob
}
export interface CompactWorkerInput {
  readonly adjustments: PlayerRuntimeState['adjustments']
  readonly checkpointId: number
  readonly revision: number
  readonly settle: boolean
}
export type WasmBufferRequest =
  | Exclude<BufferRequest, {readonly kind: 'produce'}>
  | {
      readonly id: number
      readonly kind: 'produce'
      readonly request: Omit<ProduceBufferFrame, 'input'> & {
        readonly input?: BufferedInput | CompactWorkerInput
      }
    }
export type RustBufferRequest = WasmBufferRequest | InitializeRuntimeSectionRequest
export type BufferRequest =
  | InitializeBufferRequest
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
  | {
      readonly id: number
      readonly kind: 'initialized'
      readonly bytes: number
      readonly threads?: number
      readonly geometry?: {
        readonly runtime: 'gpu' | 'cpu'
        readonly reason?: string
        readonly pipeline?: 'shared'
      }
    }
  | {readonly id: number; readonly kind: 'reset'}
  | {readonly id: number; readonly kind: 'audio'}
  | {
      readonly id: number
      readonly kind: 'produced'
      readonly frame: BufferFrame | StaleBufferFrame
    }
  | {readonly id: number; readonly kind: 'error'; readonly message: string}
export type PackedBufferResponse =
  | Exclude<BufferResponse, {readonly kind: 'produced'}>
  | {
      readonly id: number
      readonly kind: 'produced'
      readonly frame: PackedBufferFrame | StaleBufferFrame
      readonly geometry?: {
        readonly pipeline?: 'shared'
        readonly vertices: number
        /** Omitted when completion is owned by the renderer. */
        readonly corrections?: number
        /** Omitted when completion is owned by the renderer. */
        readonly all?: boolean
        readonly runtime: 'gpu' | 'cpu'
        readonly reason?: string
      }
    }
export interface BufferWorker {
  /** Maximum owned frames the backend can evaluate concurrently; omitted, one. */
  readonly concurrency?: () => number
  initialize(document: PuppetDocument, audio?: ReadonlyMap<string, PuppetSound>): Promise<number>
  updateAudio(sounds: ReadonlyMap<string, PuppetSound>): Promise<void>
  reset(state: PlayerRuntimeState, generation: number, inputRevision?: number): Promise<void>
  produce(request: ProduceBufferFrame): Promise<BufferFrame | StaleBufferFrame>
  destroy(): void
}

/** A supplied timestamp follows one refresh epoch; omitted, the scheduler's clock is used. */
export type BufferRefreshCallback = (timestamp?: number) => void

/** Borrowed host scheduling capabilities; each session cancels only its own frame requests. */
export interface BufferScheduler {
  /** Cancels the pending frame request identified by its returned handle. */
  cancelFrame(handle: number): void
  /** Finite current time in milliseconds, using one consistent epoch throughout the session. */
  now(): number
  /** Runs after the current task, reporting callback exceptions to the host. */
  queueMicrotask(callback: () => void): void
  /**
   * Defers one display-refresh callback; returns a handle unique among pending requests.
   * A supplied timestamp uses a consistent refresh epoch; omitted, cadence uses now().
   */
  requestFrame(callback: BufferRefreshCallback): number
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
  /** Original checkpoint for an adjustments-only change. Host transport metadata. */
  readonly adjustmentBase?: PlayerRuntimeState
  readonly revision: number
  readonly state: PlayerRuntimeState
  readonly settle: boolean
}
export type PlayerInputChange = 'applied' | 'superseded' | 'destroyed' | 'unavailable'
