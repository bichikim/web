import {z} from 'zod'

import {ALBUM_LOCALES} from './album-draft'

const coverFallbackSchema = z.enum(['lp', 'cd', 'music'])
const albumTranslationSchema = z.object({
  albumId: z.string(),
  description: z.string(),
  locale: z.enum(ALBUM_LOCALES),
  title: z.string(),
})
const releaseBlockerSchema = z.enum(['tracks_missing_active_asset'])
const albumSchema = z.object({
  coverFallback: coverFallbackSchema,
  coverImageUrl: z.string().nullable(),
  id: z.string(),
  release: z.object({blockers: z.array(releaseBlockerSchema), ready: z.boolean()}),
  status: z.enum(['draft', 'published', 'archived']),
  translations: z.array(albumTranslationSchema),
})
const trackSchema = z.object({
  albumId: z.string(),
  artist: z.string(),
  id: z.string(),
  position: z.number(),
  title: z.string(),
})
const assetSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'uploaded', 'ready', 'active', 'failed', 'retired', 'deleted']),
  trackId: z.string(),
})
const offerSchema = z.object({
  albumId: z.string(),
  billingType: z.enum(['one_time', 'subscription']),
  externalProductId: z.string(),
  productCode: z.string(),
  productStatus: z.enum(['active', 'archived']),
  provider: z.string(),
  status: z.enum(['active', 'inactive']),
})

export const catalogSchema = z.object({
  albums: z.array(albumSchema),
  assets: z.array(assetSchema),
  offers: z.array(offerSchema),
  tracks: z.array(trackSchema),
})

export type AdminAlbum = z.infer<typeof albumSchema>
export type AdminAsset = z.infer<typeof assetSchema>
export type AdminCatalog = z.infer<typeof catalogSchema>
export type AdminOffer = z.infer<typeof offerSchema>
export type AdminTrack = z.infer<typeof trackSchema>
export type AlbumStatusAction = 'archive' | 'publish'

export const getAlbumTranslation = (album: AdminAlbum, locale: (typeof ALBUM_LOCALES)[number]) =>
  album.translations.find((translation) => translation.locale === locale) ?? album.translations[0]
