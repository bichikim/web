export const ALBUM_LOCALES = ['ko', 'en', 'ja', 'zh-Hans'] as const

export type AlbumLocale = (typeof ALBUM_LOCALES)[number]

export interface AlbumDraftTranslation {
  readonly description: string
  readonly title: string
}

export type AlbumDraftTranslations = Record<AlbumLocale, AlbumDraftTranslation>

export interface AlbumDraftData {
  readonly albumId?: string
  readonly coverDraftId: string | null
  readonly coverFallback: 'cd' | 'lp' | 'music'
  readonly coverImageUrl: string
  readonly hasCoverFile: boolean
  readonly translations: AlbumDraftTranslations
}

export const createEmptyAlbumTranslations = (): AlbumDraftTranslations => ({
  en: {description: '', title: ''},
  ja: {description: '', title: ''},
  ko: {description: '', title: ''},
  'zh-Hans': {description: '', title: ''},
})
