import type {PlayerViewCamera} from '../player'
import type {PuppetParameterValueMap} from '../deformation'

export const TRACKING_INPUTS = [
  'faceYaw',
  'facePitch',
  'faceRoll',
  'eyeBlinkLeft',
  'eyeBlinkRight',
  'mouthOpen',
  'mouthSmile',
  'mouthRound',
  'mouthSpread',
  'browLeft',
  'browRight',
] as const
export type TrackingInput = (typeof TRACKING_INPUTS)[number]
export const LOCAL_INPUTS = ['manualValue', 'buttonValue'] as const
export const MAPPING_INPUTS = [...TRACKING_INPUTS, ...LOCAL_INPUTS] as const
export type LocalInput =
  | (typeof LOCAL_INPUTS)[number]
  | `manualValue:${string}`
  | `buttonValue:${string}`
export type MappingInput = (typeof TRACKING_INPUTS)[number] | LocalInput
export type MappingValues = Partial<Record<MappingInput, number>>
export type TrackingValues = Partial<Record<TrackingInput, number>>
export interface TrackingFrame {
  readonly timestamp: number
  readonly values: TrackingValues | null
}
export interface ParameterMapping {
  readonly collapsed?: boolean
  readonly direct?: boolean
  readonly name?: string
  readonly inputConnected?: boolean
  readonly outputConnected?: boolean
  readonly baseline?: number
  readonly multiplier?: number
  readonly parameterId: string
  readonly input: MappingInput
  readonly enabled: boolean
  readonly inputMinimum: number
  readonly inputMaximum: number
  readonly outputMinimum: number
  readonly outputMaximum: number
  readonly smoothing: number
}
export interface RuntimePreset {
  readonly id: string
  readonly name: string
  readonly key: string
  readonly values: PuppetParameterValueMap
}
export interface MotionShortcut {
  readonly motionId: string
  readonly key: string
}
export interface MouthTrackingSettings {
  readonly openSensitivity?: number
  readonly neutral: Readonly<Record<'mouthOpen' | 'mouthRound' | 'mouthSpread', number>>
  readonly roundSensitivity: number
  readonly spreadSensitivity: number
}
export interface ParameterGroup {
  readonly collapsed?: boolean
  readonly id: string
  readonly name: string
  readonly mode: 'folder' | 'broadcast'
  readonly parameterIds: ReadonlyArray<string>
}
export interface RuntimeView {
  readonly camera: PlayerViewCamera
  readonly fitted: boolean
}
export interface RuntimeProfile {
  readonly view?: RuntimeView
  readonly expandedSections?: readonly string[]
  readonly collapsedInputs?: readonly string[]
  readonly localInputIds?: readonly LocalInput[]
  readonly drafts?: ReadonlyArray<string>
  readonly groups?: ReadonlyArray<ParameterGroup>
  readonly inputs?: Readonly<Record<LocalInput, number>>
  readonly mouth?: MouthTrackingSettings
  readonly version: 2
  readonly signature: string
  readonly mappings: ReadonlyArray<ParameterMapping>
  readonly expressions: ReadonlyArray<RuntimePreset>
  readonly motions: ReadonlyArray<MotionShortcut>
}
export type TrackingStatus = 'stopped' | 'starting' | 'tracking' | 'missing' | 'error'
