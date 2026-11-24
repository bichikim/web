import type {PackedBufferResponse, RustBufferRequest} from './buffering/types'
import type {FrameAlphaSize} from './rendering-options'

export interface NativePlayerResources {
  /** Initial backing resolution in pixels. */
  readonly width: number
  readonly height: number
  /** Serialized static mesh and mask metadata for the wgpu renderer. */
  readonly metadata: string
  /** Immutable encoded textures in the order referenced by the mesh metadata. */
  readonly textures: readonly string[]
}

export interface NativePlayerTarget {
  /** The current backing resolution in pixels. */
  readonly width: number
  readonly height: number
  /** Clip-space scale and translation. */
  readonly view: readonly [number, number, number, number]
  /** Small alpha readback for click-through or the loading silhouette, omitted otherwise. */
  readonly alpha?: FrameAlphaSize
}

export interface NativePlayerPresentation extends NativePlayerTarget {
  /** Ordered render properties for the selected frame. */
  readonly display: Float32Array
  /** Resident GPU coordinates, omitted for a CPU-evaluated frame. */
  readonly frame?: number
  /** Draw vertices when no resident frame is supplied. */
  readonly vertices: Float32Array
}

/** One platform-owned character surface. The player owns and closes its lifetime. */
export interface NativePlayerSurface {
  /** Submits a current playback frame in the same request when given a target. */
  readonly playback: (
    message: RustBufferRequest,
    target?: NativePlayerTarget,
  ) => Promise<PackedBufferResponse>
  readonly readAlpha: () => Promise<Uint8Array<ArrayBuffer>>
  readonly present: (frame: NativePlayerPresentation) => Promise<Uint8Array<ArrayBuffer>>
  readonly release: (frame: number) => Promise<void>
  readonly close: () => void
}

export type NativePlayerSurfaceKind = 'metal' | 'dx12'

export interface NativePlayerBackend {
  /** Omission identifies the original Metal backend. */
  readonly kind?: NativePlayerSurfaceKind
  /** Creates a surface behind the input view. A rejected open leaves browser rendering available. */
  readonly open: (resources: NativePlayerResources) => Promise<NativePlayerSurface>
}

export {decodeWorkerResponse, encodeWorkerValue} from './buffering/worker-wire'
