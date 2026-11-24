import {z} from 'zod'
import {poffoConnectionsSchema} from './settings/connections'
import {widgetSizeSchema} from './settings/library-model'
import {wallpaperContentSchema} from './settings/model'

export const THEME_ASSET_LIMIT = 128
export const THEME_MAX_BYTES = 100_663_296
export const THEME_NAME_LIMIT = 120
const MAXIMUM_ASSET_NAME = 240
const MAXIMUM_BUILTIN_ID = 150
const MAXIMUM_WIDGETS = 32

const assetId = z.string().regex(/^[\da-z-]{1,48}$/iu)
const asset = z.object({
  id: assetId,
  kind: z.enum(['photo', 'video', 'puppet']),
  name: z.string().min(1).max(MAXIMUM_ASSET_NAME),
})
const themeAsset = z.discriminatedUnion('source', [
  asset.extend({
    builtinId: z.string().startsWith('builtin:').max(MAXIMUM_BUILTIN_ID),
    source: z.literal('builtin'),
  }),
  asset.extend({
    source: z.literal('embedded'),
    type: z.enum([
      'application/octet-stream',
      'image/avif',
      'image/gif',
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ]),
  }),
])
export const themeManifestSchema = z
  .object({
    assets: z.array(themeAsset).max(THEME_ASSET_LIMIT),
    background: wallpaperContentSchema.optional(),
    format: z.literal('poffo-theme'),
    name: z.string().trim().min(1).max(THEME_NAME_LIMIT),
    version: z.literal(1),
    widgets: z
      .array(
        z.object({
          assetId,
          connections: poffoConnectionsSchema.optional(),
          motionId: z.string().max(MAXIMUM_ASSET_NAME).nullish(),
          size: widgetSizeSchema.optional(),
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
        }),
      )
      .max(MAXIMUM_WIDGETS)
      .optional(),
  })
  .superRefine((manifest, context) => {
    const assets = new Map(manifest.assets.map((item) => [item.id, item.kind]))
    const {background, widgets} = manifest
    if (background === undefined && !widgets?.length) {
      context.addIssue({code: 'custom', message: 'A theme must include a background or widgets.'})
    }
    const referencesMatch =
      (background?.mode !== 'puppet' ||
        background.assetId === null ||
        assets.get(background.assetId) === 'puppet') &&
      (background?.mode !== 'album' ||
        background.mediaIds.every((id) => {
          const kind = assets.get(id)
          return kind === 'photo' || kind === 'video'
        })) &&
      (widgets === undefined || widgets.every((widget) => assets.get(widget.assetId) === 'puppet'))
    if (assets.size !== manifest.assets.length || !referencesMatch) {
      context.addIssue({code: 'custom', message: 'Theme asset references are invalid.'})
    }
  })

export type ThemeManifest = z.infer<typeof themeManifestSchema>
export type ThemeAsset = ThemeManifest['assets'][number]
export interface ThemeArchive {
  readonly assets: Readonly<Record<string, Uint8Array>>
  readonly manifest: ThemeManifest
}
