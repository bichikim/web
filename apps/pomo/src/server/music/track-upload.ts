import {parseWebStream} from 'music-metadata'

import {createLegacyTrackPreviewKey, createTrackPreviewKey} from './track-upload/preview'
import {
  createTrackObjectUrl,
  type PaidAudioEnvironment,
  signTrackObjectRequest,
  type TrackStorageOptions,
} from './track-upload/storage'

export {
  createTrackPreviewKey,
  createTrackPreviewObject,
  ensureTrackPreviewObject,
  readTrackPreviewObject,
  type TrackPreviewObject,
} from './track-upload/preview'

const UPLOAD_EXPIRY_SECONDS = 900
const PLAYBACK_EXPIRY_SECONDS = 900
const MILLISECONDS_PER_SECOND = 1000
const HTTP_NOT_FOUND = 404
// oxlint-disable-next-line eslint/no-magic-numbers -- Paid source MP3 limit is 250 MiB.
export const MAXIMUM_TRACK_BYTES = 250 * 1024 * 1024

interface TrackUploadOptions extends TrackStorageOptions {}

interface ParsedAudio {
  readonly common?: {
    readonly picture?: ReadonlyArray<{
      readonly data: Uint8Array
      readonly format: string
      readonly type?: string
    }>
  }
  readonly format: {
    readonly codec?: string
    readonly container?: string
    readonly duration?: number
  }
}

type ParseAudio = (
  stream: ReadableStream<Uint8Array>,
  fileInfo: {readonly mimeType: string; readonly size: number},
) => Promise<ParsedAudio>

interface InspectTrackOptions extends TrackUploadOptions {
  readonly fetcher?: typeof fetch
  readonly parseAudio?: ParseAudio
}

interface DeleteTrackOptions extends TrackUploadOptions {
  readonly fetcher?: typeof fetch
}

export interface TrackUpload {
  readonly expiresAt: string
  readonly uploadUrl: string
}

export interface TrackPlayback {
  readonly expiresAt: Date
  readonly url: string
}

export interface TrackInspection {
  readonly artwork?: TrackArtwork
  readonly durationMs: number
  readonly etag: string
  readonly sizeBytes: bigint
}

export interface TrackArtwork {
  readonly body: ArrayBuffer
  readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp'
}

const TRACK_VALIDATION_FAILURE_CODES = new Set([
  'invalid_mp3',
  'invalid_mp3_frames',
  'invalid_mp3_id3',
  'invalid_track_metadata',
])

// Embedded artwork shares the same prepared-image limit as album covers.
// oxlint-disable-next-line eslint/no-magic-numbers -- Prepared artwork limit is four MiB.
const MAXIMUM_ARTWORK_BYTES = 4 * 1024 * 1024
// oxlint-disable-next-line eslint/no-magic-numbers -- File signatures are fixed binary bytes.
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const
// oxlint-disable-next-line eslint/no-magic-numbers -- File signatures are fixed binary bytes.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const
// oxlint-disable-next-line eslint/no-magic-numbers -- File signatures are fixed binary bytes.
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] as const
// oxlint-disable-next-line eslint/no-magic-numbers -- File signatures are fixed binary bytes.
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50] as const
const WEBP_SIGNATURE_OFFSET = 8

const hasBytes = (data: Uint8Array, expected: readonly number[], offset = 0): boolean =>
  expected.every((value, index) => data[offset + index] === value)

const getArtworkContentType = (
  format: string,
  data: Uint8Array,
): TrackArtwork['contentType'] | undefined => {
  const normalizedFormat = format.toLowerCase()

  if (
    (normalizedFormat === 'image/jpeg' || normalizedFormat === 'image/jpg') &&
    hasBytes(data, JPEG_SIGNATURE)
  ) {
    return 'image/jpeg'
  }

  if (normalizedFormat === 'image/png' && hasBytes(data, PNG_SIGNATURE)) {
    return 'image/png'
  }

  if (
    normalizedFormat === 'image/webp' &&
    hasBytes(data, RIFF_SIGNATURE) &&
    hasBytes(data, WEBP_SIGNATURE, WEBP_SIGNATURE_OFFSET)
  ) {
    return 'image/webp'
  }

  return undefined
}

const extractTrackArtwork = (metadata: ParsedAudio): TrackArtwork | undefined => {
  const pictures = metadata.common?.picture ?? []
  const orderedPictures = pictures.toSorted(
    (left, right) =>
      Number(right.type?.toLowerCase().includes('front') === true) -
      Number(left.type?.toLowerCase().includes('front') === true),
  )

  for (const picture of orderedPictures) {
    const contentType = getArtworkContentType(picture.format, picture.data)

    if (
      contentType !== undefined &&
      picture.data.byteLength > 0 &&
      picture.data.byteLength <= MAXIMUM_ARTWORK_BYTES
    ) {
      return {
        body: Uint8Array.from(picture.data).buffer,
        contentType,
      }
    }
  }

  return undefined
}

export const isTrackValidationError = (error: unknown): error is TypeError =>
  error instanceof TypeError && TRACK_VALIDATION_FAILURE_CODES.has(error.message)

export const createTrackUpload = async (
  objectKey: string,
  options: TrackUploadOptions = {},
): Promise<TrackUpload> => {
  const environment = options.environment ?? process.env
  const objectUrl = createTrackObjectUrl(objectKey, environment)
  objectUrl.searchParams.set('X-Amz-Expires', UPLOAD_EXPIRY_SECONDS.toString())
  const request = new Request(objectUrl, {
    headers: {'Content-Type': 'audio/mpeg'},
    method: 'PUT',
  })
  const signedRequest = await signTrackObjectRequest(
    request,
    environment,
    true,
    options.signRequest,
  )

  return {
    expiresAt: new Date(Date.now() + UPLOAD_EXPIRY_SECONDS * MILLISECONDS_PER_SECOND).toISOString(),
    uploadUrl: signedRequest.url,
  }
}

export const createTrackPlayback = async (
  objectKey: string,
  options: TrackUploadOptions = {},
): Promise<TrackPlayback> => {
  const environment = options.environment ?? process.env
  const objectUrl = createTrackObjectUrl(objectKey, environment)
  objectUrl.searchParams.set('X-Amz-Expires', PLAYBACK_EXPIRY_SECONDS.toString())
  const request = new Request(objectUrl)
  const signedRequest = await signTrackObjectRequest(
    request,
    environment,
    true,
    options.signRequest,
  )

  return {
    expiresAt: new Date(Date.now() + PLAYBACK_EXPIRY_SECONDS * MILLISECONDS_PER_SECOND),
    url: signedRequest.url,
  }
}

export const inspectTrackUpload = async (
  objectKey: string,
  options: InspectTrackOptions = {},
): Promise<TrackInspection> => {
  const environment = options.environment ?? process.env
  const request = new Request(createTrackObjectUrl(objectKey, environment))
  const signedRequest = await signTrackObjectRequest(
    request,
    environment,
    false,
    options.signRequest,
  )
  const response = await (options.fetcher ?? fetch)(signedRequest)

  if (!response.ok || response.body === null) {
    throw new Error(`R2 track read failed with status ${response.status}`)
  }

  const size = Number(response.headers.get('Content-Length'))
  const etag = response.headers.get('ETag')

  if (!Number.isSafeInteger(size) || size <= 0 || size > MAXIMUM_TRACK_BYTES || etag === null) {
    throw new TypeError('invalid_track_metadata')
  }

  const parseAudio =
    options.parseAudio ?? ((stream, fileInfo) => parseWebStream(stream, fileInfo, {duration: true}))
  const metadata = await parseAudio(response.body, {mimeType: 'audio/mpeg', size})
  const {duration} = metadata.format
  const {codec} = metadata.format

  if (
    metadata.format.container !== 'MPEG' ||
    codec === undefined ||
    !codec.includes('Layer 3') ||
    duration === undefined ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    throw new TypeError('invalid_mp3')
  }

  const artwork = extractTrackArtwork(metadata)

  return {
    ...(artwork === undefined ? {} : {artwork}),
    durationMs: Math.round(duration * MILLISECONDS_PER_SECOND),
    etag,
    sizeBytes: BigInt(size),
  }
}

export const deleteTrackObject = async (
  objectKey: string,
  options: DeleteTrackOptions = {},
): Promise<void> => {
  const environment = options.environment ?? process.env
  const objectKeys = [
    objectKey,
    createTrackPreviewKey(objectKey),
    createLegacyTrackPreviewKey(objectKey),
  ]
  const responses = await Promise.all(
    objectKeys.map(async (targetKey) => {
      const request = new Request(createTrackObjectUrl(targetKey, environment), {method: 'DELETE'})
      const signedRequest = await signTrackObjectRequest(
        request,
        environment,
        false,
        options.signRequest,
      )
      return (options.fetcher ?? fetch)(signedRequest)
    }),
  )
  const failedResponse = responses.find(
    (response) => !response.ok && response.status !== HTTP_NOT_FOUND,
  )

  if (failedResponse !== undefined) {
    throw new Error(`R2 track delete failed with status ${failedResponse.status}`)
  }
}
