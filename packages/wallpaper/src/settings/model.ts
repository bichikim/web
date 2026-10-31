import {z} from 'zod'
import {
  backgroundWebsiteUrlSchema,
  type MediaFit,
  RANDOM_TRANSITIONS,
  type TransitionEffect,
} from '../model'
import {DEFAULT_INTERACTION, type InteractionSettings} from '../interaction/types'
import {createWallpaperContent} from './create-wallpaper-content'
import {
  poffoBindingsSchema,
  type PoffoTracking,
  type PoffoTrackingBindings,
  type PoffoTrackingOptions,
  poffoTrackingOptionsSchema,
  poffoTrackingSchema,
} from './tracking'

const MAXIMUM_PHOTO_SECONDS = 300

export interface PuppetWallpaper {
  readonly mode: 'puppet'
  readonly assetId: string | null
  readonly placement?: PoffoPlacement
  readonly tracking?: PoffoTracking
  readonly trackingBindings?: PoffoTrackingBindings
  readonly trackingOptions?: PoffoTrackingOptions
}

export interface PoffoPlacement {
  readonly x: number
  readonly y: number
  readonly scale: number
}

export const DEFAULT_POFFO_PLACEMENT: PoffoPlacement = {scale: 1, x: 0.5, y: 0.5}
const MINIMUM_POFFO_SCALE = 0.1
export const poffoPlacementSchema: z.ZodType<PoffoPlacement> = z.object({
  scale: z.number().min(MINIMUM_POFFO_SCALE).max(2),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
})

export interface WebsiteCustomization {
  readonly css?: string
  readonly script?: string
}

export interface WebsiteWallpaper extends WebsiteCustomization {
  readonly mode: 'website'
  readonly url: string | null
}

export interface AlbumWallpaper {
  /** Media sizing within the monitor; omitted to show the whole image. */
  readonly fit?: MediaFit
  readonly mode: 'album'
  readonly mediaIds: readonly string[]
  readonly order: 'sequential' | 'random'
  readonly photoSeconds: number
  readonly videoMode: 'end' | 'hold' | 'loop'
  readonly transition: TransitionEffect | 'random'
}

export type WallpaperContent = PuppetWallpaper | WebsiteWallpaper | AlbumWallpaper

export interface MonitorWallpaper {
  readonly monitorId: string
  readonly content: WallpaperContent
  readonly interaction: InteractionSettings
}

export const interactionSettingsSchema: z.ZodType<InteractionSettings> = z.object({
  activation: z
    .enum(['passThrough', 'always', 'hold', 'modifierHold'])
    .transform((activation) => (activation === 'always' ? 'always' : 'passThrough')),
})

export const wallpaperContentSchema: z.ZodType<WallpaperContent> = z.discriminatedUnion('mode', [
  z.object({
    assetId: z.string().min(1).nullable(),
    mode: z.literal('puppet'),
    placement: poffoPlacementSchema.optional(),
    tracking: poffoTrackingSchema.optional(),
    trackingBindings: poffoBindingsSchema.optional(),
    trackingOptions: poffoTrackingOptionsSchema.optional(),
  }),
  z.object({
    css: z.string().optional(),
    mode: z.literal('website'),
    script: z.string().optional(),
    url: backgroundWebsiteUrlSchema.nullable(),
  }),
  z.object({
    fit: z.enum(['contain', 'cover']).optional(),
    mediaIds: z.array(z.string().min(1)),
    mode: z.literal('album'),
    order: z.enum(['sequential', 'random']),
    photoSeconds: z.number().min(1).max(MAXIMUM_PHOTO_SECONDS),
    transition: z.enum(['none', 'random', ...RANDOM_TRANSITIONS]).default('fade'),
    videoMode: z.enum(['end', 'hold', 'loop']),
  }),
])

export const monitorWallpaperSchema: z.ZodType<MonitorWallpaper> = z.object({
  content: wallpaperContentSchema,
  interaction: interactionSettingsSchema,
  monitorId: z.string().min(1),
})

/** Creates default settings without sharing mutable objects between monitors. */
export const createMonitorWallpaper = (monitorId: string): MonitorWallpaper =>
  monitorWallpaperSchema.parse({
    content: createWallpaperContent('album'),
    interaction: {...DEFAULT_INTERACTION},
    monitorId,
  })
