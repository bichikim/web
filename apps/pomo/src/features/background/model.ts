import {z} from 'zod'

export const MAX_PHOTO_BYTES = 3_000_000
export const MAX_VIDEO_BYTES = 30_000_000

const MAX_PHOTO_SECONDS = 300
export const RANDOM_TRANSITIONS = [
  'fade',
  'directional-wipe',
  'cross-warp',
  'circle-open',
  'rgb-kinetic',
] as const

export const backgroundPreferencesSchema = z.object({
  mode: z.enum(['character', 'frame']),
  order: z.enum(['sequential', 'random']),
  pairPhotos: z.boolean().default(false),
  photoSeconds: z.number().int().min(1).max(MAX_PHOTO_SECONDS),
  randomTransitions: z.boolean().default(false),
  transition: z.preprocess(
    (value) => (value === 'water-drop' ? 'fade' : value),
    z.enum(['none', ...RANDOM_TRANSITIONS]).default('fade'),
  ),
  transitionPool: z.preprocess(
    (value) => {
      if (!Array.isArray(value)) {
        return value
      }
      const retained = value.filter((effect) => effect !== 'water-drop')
      return value.length > 0 && retained.length === 0 ? ['fade'] : retained
    },
    z
      .array(z.enum(RANDOM_TRANSITIONS))
      .min(1)
      .default([...RANDOM_TRANSITIONS]),
  ),
  videoMode: z.enum(['end', 'hold', 'loop']).default('end'),
})

export type BackgroundMode = 'character' | 'frame'
export type PlaybackOrder = 'sequential' | 'random'
export type TransitionEffect = 'none' | (typeof RANDOM_TRANSITIONS)[number]
export type MediaKind = 'photo' | 'video'
export type VideoPlaybackMode = 'end' | 'hold' | 'loop'
export interface BackgroundPreferences {
  readonly videoMode: VideoPlaybackMode
  readonly randomTransitions: boolean
  readonly transitionPool: readonly (typeof RANDOM_TRANSITIONS)[number][]
  readonly transition: TransitionEffect
  readonly pairPhotos: boolean
  readonly mode: BackgroundMode
  readonly order: PlaybackOrder
  readonly photoSeconds: number
}
export interface BackgroundMedia {
  readonly contentHash?: string
  readonly id: string
  readonly name: string
  readonly kind: MediaKind
  readonly size: number
}
export interface BackgroundSnapshot {
  readonly preferences: BackgroundPreferences
  readonly items: readonly BackgroundMedia[]
}
export const DEFAULT_BACKGROUND: BackgroundPreferences = {
  mode: 'character',
  order: 'sequential',
  pairPhotos: false,
  photoSeconds: 10,
  randomTransitions: false,
  transition: 'fade',
  transitionPool: [...RANDOM_TRANSITIONS],
  videoMode: 'end',
}
export const backgroundSnapshotSchema = z.object({
  items: z.array(
    z.object({
      contentHash: z
        .string()
        .regex(/^[a-f0-9]{64}$/u)
        .optional(),
      id: z.string().uuid(),
      kind: z.enum(['photo', 'video']),
      name: z.string(),
      size: z.number().nonnegative(),
    }),
  ),
  preferences: backgroundPreferencesSchema,
})
export interface BackgroundRepository {
  readonly read: () => Promise<BackgroundSnapshot>
  readonly configure: (patch: Partial<BackgroundPreferences>) => Promise<void>
  readonly add: (file: File, kind: MediaKind) => Promise<void>
  readonly remove: (id: string) => Promise<void>
  readonly load: (id: string) => Promise<Blob>
  readonly subscribe: (refresh: () => void, onError: (error: unknown) => void) => () => void
}
