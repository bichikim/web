import type {LipSyncShape} from '@winter-love/wallpaper/settings/lipsync'

/** Relative pose contributions, with a total no greater than one. */
export type LipSyncWeights = Readonly<Partial<Record<LipSyncShape, number>>>
export interface LipSyncCue {
  readonly start: number
  readonly end: number
  readonly shape: LipSyncShape | null
}
export interface LipSyncMotion {
  readonly phase: 'prepare' | 'hold' | 'release'
  readonly weight: number
}
export interface LipSyncPose {
  readonly weights?: LipSyncWeights
  readonly openingWeights?: LipSyncWeights
  readonly motion?: LipSyncMotion
}
export type LipSyncOutput = (
  shape: LipSyncShape | null,
  level: number,
  weights?: LipSyncWeights,
  pose?: LipSyncPose,
) => void

export interface MicrophoneState {
  readonly widgetId: string
  readonly phase: 'off' | 'starting' | 'listening' | 'error'
  readonly level: number
  readonly error?: string
  readonly devices?: readonly MicrophoneDevice[]
}
export interface MicrophoneDevice {
  readonly id: string
  readonly label: string
}
export interface MicrophoneRequest {
  readonly widgetId: string
  readonly action: 'read' | 'retry'
}
