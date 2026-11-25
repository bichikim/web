import {z} from 'zod'
import type {PoffoTrackingBinding} from './tracking'

export const LIP_SYNC_SHAPES = ['a', 'i', 'u', 'e', 'o', 'closed'] as const
export type LipSyncShape = (typeof LIP_SYNC_SHAPES)[number]
export type LipSyncSource = 'off' | 'voice' | 'speech' | 'microphone'
export const DEFAULT_MICROPHONE_THRESHOLD = 0.15
const MICROPHONE_ID_LIMIT = 512
export const MAXIMUM_LIPSYNC_GAIN = 3
export interface PoffoMicrophone {
  /** Saved audio input; omitted or empty follows the system default. */
  readonly deviceId?: string
  /** Normalized input level below which mouth motion is suppressed; omitted uses the default. */
  readonly threshold?: number
}
export interface PoffoLipSync extends PoffoTrackingBinding {
  readonly shapes?: Partial<Record<LipSyncShape, PoffoTrackingBinding>>
  readonly source: LipSyncSource
  readonly gain?: number
  readonly microphone?: PoffoMicrophone
}
export const DEFAULT_POFFO_LIPSYNC = {gain: 1.5, source: 'voice'} satisfies PoffoLipSync
export const poffoLipSyncSchema = z.object({
  gain: z.number().finite().min(0).max(MAXIMUM_LIPSYNC_GAIN).optional(),
  inverted: z.boolean().optional(),
  microphone: z
    .object({
      deviceId: z.string().max(MICROPHONE_ID_LIMIT).optional(),
      threshold: z.number().finite().min(0).max(1).optional(),
    })
    .optional(),
  parameterId: z.string().min(1).nullable().optional(),
  shapes: z
    .partialRecord(
      z.enum(LIP_SYNC_SHAPES),
      z.object({
        inverted: z.boolean().optional(),
        parameterId: z.string().min(1).nullable().optional(),
      }),
    )
    .optional(),
  source: z.enum(['off', 'voice', 'speech', 'microphone']),
})
