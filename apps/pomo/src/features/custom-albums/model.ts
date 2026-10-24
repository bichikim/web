const BYTES_PER_KIBIBYTE = 1024
const KIBIBYTES_PER_MEBIBYTE = 1024
const CUSTOM_TRACK_MEBIBYTE_LIMIT = 25
const CUSTOM_ALBUM_MEBIBYTE_LIMIT = 100
const CUSTOM_LIBRARY_MEBIBYTE_LIMIT = 250
const CUSTOM_COVER_SOURCE_MEBIBYTE_LIMIT = 10
const CUSTOM_COVER_MEBIBYTE_LIMIT = 1

export const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * KIBIBYTES_PER_MEBIBYTE
export const MAXIMUM_CUSTOM_TRACK_BYTES = CUSTOM_TRACK_MEBIBYTE_LIMIT * BYTES_PER_MEBIBYTE
export const MAXIMUM_CUSTOM_ALBUM_BYTES = CUSTOM_ALBUM_MEBIBYTE_LIMIT * BYTES_PER_MEBIBYTE
export const MAXIMUM_CUSTOM_LIBRARY_BYTES = CUSTOM_LIBRARY_MEBIBYTE_LIMIT * BYTES_PER_MEBIBYTE
export const MAXIMUM_CUSTOM_COVER_SOURCE_BYTES =
  CUSTOM_COVER_SOURCE_MEBIBYTE_LIMIT * BYTES_PER_MEBIBYTE
export const MAXIMUM_CUSTOM_COVER_BYTES = CUSTOM_COVER_MEBIBYTE_LIMIT * BYTES_PER_MEBIBYTE
export const CUSTOM_ALBUM_COVER_EDGE = 512
export const MAXIMUM_CUSTOM_TRACK_COUNT = 40
export const CUSTOM_TRACK_ID_PREFIX = 'custom-track:'
export const CUSTOM_ALBUM_COVER_SOURCES = ['automatic', 'manual'] as const
export const CUSTOM_ALBUM_ICONS = [
  'disc',
  'sunrise',
  'moon',
  'headphones',
  'waves',
  'leaf',
] as const

export type CustomAlbumIcon = (typeof CUSTOM_ALBUM_ICONS)[number]
export type CustomAlbumCoverSource = (typeof CUSTOM_ALBUM_COVER_SOURCES)[number]

export const CUSTOM_ALBUM_ICON_CLASSES = {
  disc: 'i-tabler-disc',
  headphones: 'i-tabler-headphones',
  leaf: 'i-tabler-leaf',
  moon: 'i-tabler-moon',
  sunrise: 'i-tabler-sunrise',
  waves: 'i-tabler-wave-sine',
} satisfies Record<CustomAlbumIcon, string>

export type CustomAlbumCoverUpdate =
  | {readonly kind: 'keep'}
  | {readonly image: Blob | null; readonly kind: 'replace'}

export const isSupportedCustomAudio = (audio: Blob, fileName: string): boolean =>
  audio.type.startsWith('audio/') || /\.(?:aac|flac|m4a|mp3|ogg|wav|webm)$/iu.test(fileName)

export const isSupportedCustomAlbumCover = (image: Blob): boolean =>
  image.type === 'image/webp' && image.size > 0 && image.size <= MAXIMUM_CUSTOM_COVER_BYTES

export interface CustomAlbumTrack {
  readonly audio: Blob
  readonly durationSeconds: number
  readonly fileName: string
  readonly id: string
  readonly title: string
}

export interface CustomAlbumDraft {
  readonly artist: string
  readonly coverIcon: CustomAlbumIcon
  readonly coverImage: Blob | null
  readonly coverSource: CustomAlbumCoverSource
  readonly id: string
  readonly title: string
  readonly tracks: readonly CustomAlbumTrack[]
}

export interface SaveCustomAlbumOptions {
  readonly albumId: string | null
  readonly artist: string
  readonly coverIcon: CustomAlbumIcon
  readonly coverImage: CustomAlbumCoverUpdate
  readonly coverSource: CustomAlbumCoverSource
  readonly title: string
  readonly tracks: readonly CustomAlbumTrack[]
}

export type CustomAlbumErrorCode =
  | 'album-missing'
  | 'album-too-large'
  | 'corrupt-data'
  | 'cover-too-large'
  | 'database-unavailable'
  | 'invalid-audio'
  | 'invalid-album'
  | 'invalid-cover'
  | 'library-too-large'
  | 'quota-exceeded'
  | 'track-too-large'

export interface CustomAlbumErrorOptions {
  readonly cause?: unknown
}

export class CustomAlbumError extends Error {
  readonly code: CustomAlbumErrorCode

  constructor(code: CustomAlbumErrorCode, options: CustomAlbumErrorOptions = {}) {
    super(code, options.cause === undefined ? undefined : {cause: options.cause})
    this.code = code
    this.name = 'CustomAlbumError'
  }
}
