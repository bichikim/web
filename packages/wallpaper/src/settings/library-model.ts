import {z} from 'zod'
import {type PoffoVoice, poffoVoiceSchema} from './voice'
import {type PoffoLipSync, poffoLipSyncSchema} from './lipsync'
import {type AgentStateBindings, agentStateBindingsSchema} from './agent-state'
import {backgroundWebsiteUrlSchema} from '../model'
import type {PoffoTracking, PoffoTrackingBindings, PoffoTrackingOptions} from './tracking'

export interface WebsiteVisit {
  readonly url: string
  readonly visitedAt: number
}
export interface RememberedWebsite {
  readonly monitorId: string
  readonly url: string
}
export interface PoffoWidget {
  readonly id: string
  readonly assetId: string
  readonly x: number | null
  readonly y: number | null
  readonly size?: WidgetSize
  readonly tracking?: PoffoTracking
  readonly trackingBindings?: PoffoTrackingBindings
  readonly trackingOptions?: PoffoTrackingOptions
  readonly speech?: PoffoSpeech
  readonly motionId?: string | null
}
export const poffoMotionSchema = z.string().min(1).nullish()
export interface PoffoSpeechPosition {
  readonly anchor?: 'top' | 'bottom'
  readonly x: number
  readonly y: number
}
export interface PoffoSpeech extends PoffoSpeechPosition {
  readonly agentBindings?: AgentStateBindings
  readonly lipsync?: PoffoLipSync
  readonly wrap?: boolean
  readonly voice?: PoffoVoice
  readonly enabled: boolean
}
export const DEFAULT_POFFO_SPEECH: PoffoSpeech = {enabled: true, x: 0.9, y: 0.05}
export const POFFO_SPEECH_BOUNDS = {maxX: 2, maxY: 1.5, minX: -1, minY: -0.5}
export const poffoSpeechSchema = z.object({
  agentBindings: agentStateBindingsSchema.optional(),
  anchor: z.enum(['top', 'bottom']).optional(),
  enabled: z.boolean(),
  lipsync: poffoLipSyncSchema.optional(),
  voice: poffoVoiceSchema.optional(),
  wrap: z.boolean().optional(),
  x: z.number().finite().min(POFFO_SPEECH_BOUNDS.minX).max(POFFO_SPEECH_BOUNDS.maxX),
  y: z.number().finite().min(POFFO_SPEECH_BOUNDS.minY).max(POFFO_SPEECH_BOUNDS.maxY),
})
export interface WidgetSize {
  readonly width: number
  readonly height: number
}
export interface WidgetPosition {
  readonly x: number
  readonly y: number
}
export interface VisitWebsiteOptions extends WebsiteVisit {
  readonly monitorId: string
}
export interface WallpaperLibrary {
  readonly history: readonly WebsiteVisit[]
  readonly websites: readonly RememberedWebsite[]
  readonly widgets: readonly PoffoWidget[]
}

export const MINIMUM_WIDGET_SIZE: WidgetSize = {height: 210, width: 160}
export const MAXIMUM_WIDGET_EDGE = 4096

export const websiteVisitSchema = z.object({
  monitorId: z.string().min(1),
  url: backgroundWebsiteUrlSchema.transform((url) => new URL(url).href),
  visitedAt: z.number().finite().nonnegative(),
})
export const widgetPositionSchema = z.object({x: z.number().finite(), y: z.number().finite()})
export const widgetSizeSchema = z.object({
  height: z.number().finite().min(MINIMUM_WIDGET_SIZE.height).max(MAXIMUM_WIDGET_EDGE),
  width: z.number().finite().min(MINIMUM_WIDGET_SIZE.width).max(MAXIMUM_WIDGET_EDGE),
})
