export interface HitMask {
  readonly width: number
  readonly height: number
  readonly runs: readonly (readonly [number, number, number])[]
}
export interface HitRegion {
  readonly interactive: boolean
  readonly mask: HitMask | null
  /** Whether the surface is ready to receive input; omitted, ordinary regions are ready. */
  readonly ready?: boolean
}
export interface HitMaskRequest {
  readonly captureAlpha?: true
  readonly bitmap: ImageBitmap
  readonly height: number
  readonly id: number
  readonly width: number
}
export interface SampledHitMask {
  readonly alpha?: FrameAlphaSample
  readonly id: number
  readonly kind: 'mask'
  readonly mask: HitMask
}
export interface FailedHitMask {
  readonly id: number
  readonly kind: 'error'
  readonly message: string
}
export type HitMaskResponse = SampledHitMask | FailedHitMask
import type {FrameAlphaSample} from '@winter-love/puppet/player'
