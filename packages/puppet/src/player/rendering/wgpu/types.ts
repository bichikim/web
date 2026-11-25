import type {GeometryToken} from '../../geometry/types'
import type {FrameAlphaSample, FrameAlphaSize} from '../../rendering-options'
export interface InitializeGpu {
  readonly alphaCapture?: boolean
  readonly kind: 'initialize'
  readonly metadata: string
  readonly width: number
  readonly height: number
  readonly samples: number
  /** Transferred display surface. When omitted, the worker returns a bitmap for each draw. */
  readonly surface?: OffscreenCanvas
  readonly textures: ReadonlyArray<ImageBitmap>
}
export interface DrawGpu {
  readonly alpha?: FrameAlphaSize
  readonly geometry?: GeometryToken
  readonly kind: 'draw'
  readonly width: number
  readonly height: number
  readonly view: readonly [number, number, number, number]
  readonly vertices: Float32Array
  readonly display: Float32Array
}
export interface InitializeRequest extends InitializeGpu {
  readonly id: number
}
export interface DrawRequest extends DrawGpu {
  readonly id: number
}
export interface ConnectGpu {
  readonly kind: 'connect'
  readonly id: number
  readonly owner: string
  readonly connection: number
  readonly port: MessagePort
}
export interface ReleaseGpu {
  readonly kind: 'release-geometry'
  readonly id: number
  readonly token: GeometryToken
}
export interface DisconnectGpu {
  readonly kind: 'disconnect-geometry'
  readonly id: number
  readonly connection: number
}
export type GpuCommand = InitializeGpu | DrawGpu | Omit<ConnectGpu, 'id'>
export type GpuRequest = InitializeRequest | DrawRequest | ConnectGpu | ReleaseGpu | DisconnectGpu
export interface ConnectedGpu {
  readonly kind: 'connected'
  readonly id: number
}
export interface InitializedGpu {
  readonly kind: 'initialized'
  readonly id: number
}
export interface RenderedGpu {
  readonly geometry?: GeometryToken

  readonly kind: 'rendered'
  readonly id: number
  readonly bitmap: ImageBitmap | null
  readonly vertices: Float32Array
  readonly display: Float32Array
}
export interface FailedGpu {
  readonly kind: 'error'
  readonly id: number
  readonly message: string
}

interface SampledAlpha {
  readonly id: number
  readonly kind: 'alpha'
  readonly sample: FrameAlphaSample
}

interface FailedAlpha {
  readonly id: number
  readonly kind: 'alpha-error'
  readonly message: string
}

export type AlphaResponse = SampledAlpha | FailedAlpha
export type GpuResponse = InitializedGpu | RenderedGpu | FailedGpu | ConnectedGpu | AlphaResponse
