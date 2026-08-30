import {extractMp3Preview} from '../mp3-preview'
import {createTrackObjectUrl, signTrackObjectRequest, type TrackStorageOptions} from './storage'

const MILLISECONDS_PER_SECOND = 1000
const PREVIEW_DURATION_SECONDS = 30
const PREVIEW_DURATION_MS = PREVIEW_DURATION_SECONDS * MILLISECONDS_PER_SECOND
// oxlint-disable-next-line eslint/no-magic-numbers -- Binary size units use 1024 bytes.
const BYTES_PER_MEBIBYTE = 1024 * 1024
const MAXIMUM_PREVIEW_INPUT_BYTES = 2 * BYTES_PER_MEBIBYTE
const HTTP_NOT_FOUND = 404

export interface TrackPreviewOptions extends TrackStorageOptions {
  readonly fetcher?: typeof fetch
}

export interface TrackPreviewObject {
  readonly body: ReadableStream<Uint8Array>
  readonly contentLength: number
  readonly etag: string | null
}

export const createTrackPreviewKey = (objectKey: string): string => {
  if (!objectKey.endsWith('/source.mp3')) {
    throw new TypeError('invalid_track_object_key')
  }

  return `${objectKey.slice(0, -'source.mp3'.length)}preview-v1.mp3`
}

export const createLegacyTrackPreviewKey = (objectKey: string): string =>
  `${objectKey.slice(0, -'source.mp3'.length)}preview.mp3`

const requireBoundedAudioResponse = async (
  response: Response,
  maximumBytes: number,
): Promise<Uint8Array> => {
  const contentLength = Number(response.headers.get('Content-Length'))

  if (
    !response.ok ||
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > maximumBytes
  ) {
    throw new Error(`R2 bounded track read failed with status ${response.status}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())

  if (bytes.byteLength !== contentLength) {
    throw new Error('R2 bounded track read returned an invalid body length')
  }

  return bytes
}

export const createTrackPreviewObject = async (
  objectKey: string,
  durationMs: number,
  options: TrackPreviewOptions = {},
): Promise<void> => {
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
    throw new TypeError('invalid_track_duration')
  }

  const environment = options.environment ?? process.env
  const sourceRequest = new Request(createTrackObjectUrl(objectKey, environment), {
    headers: {Range: `bytes=0-${MAXIMUM_PREVIEW_INPUT_BYTES - 1}`},
  })
  const signedSourceRequest = await signTrackObjectRequest(
    sourceRequest,
    environment,
    false,
    options.signRequest,
  )
  const sourceResponse = await (options.fetcher ?? fetch)(signedSourceRequest)
  const sourceBytes = await requireBoundedAudioResponse(sourceResponse, MAXIMUM_PREVIEW_INPUT_BYTES)
  const previewBytes = extractMp3Preview(sourceBytes, Math.min(durationMs, PREVIEW_DURATION_MS))
  const previewBody = new ArrayBuffer(previewBytes.byteLength)
  new Uint8Array(previewBody).set(previewBytes)
  const previewRequest = new Request(
    createTrackObjectUrl(createTrackPreviewKey(objectKey), environment),
    {
      body: previewBody,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': previewBytes.byteLength.toString(),
        'Content-Type': 'audio/mpeg',
      },
      method: 'PUT',
    },
  )
  const signedPreviewRequest = await signTrackObjectRequest(
    previewRequest,
    environment,
    false,
    options.signRequest,
  )
  const previewResponse = await (options.fetcher ?? fetch)(signedPreviewRequest)

  if (!previewResponse.ok) {
    throw new Error(`R2 track preview write failed with status ${previewResponse.status}`)
  }
}

export const readTrackPreviewObject = async (
  objectKey: string,
  options: TrackPreviewOptions = {},
): Promise<TrackPreviewObject | null> => {
  const environment = options.environment ?? process.env
  const request = new Request(createTrackObjectUrl(createTrackPreviewKey(objectKey), environment))
  const signedRequest = await signTrackObjectRequest(
    request,
    environment,
    false,
    options.signRequest,
  )
  const response = await (options.fetcher ?? fetch)(signedRequest)

  if (response.status === HTTP_NOT_FOUND) {
    return null
  }

  const contentLength = Number(response.headers.get('Content-Length'))

  if (
    !response.ok ||
    response.body === null ||
    !Number.isSafeInteger(contentLength) ||
    contentLength <= 0 ||
    contentLength > MAXIMUM_PREVIEW_INPUT_BYTES
  ) {
    throw new Error(`R2 track preview read failed with status ${response.status}`)
  }

  return {body: response.body, contentLength, etag: response.headers.get('ETag')}
}

export const ensureTrackPreviewObject = async (
  objectKey: string,
  durationMs: number,
  options: TrackPreviewOptions = {},
): Promise<TrackPreviewObject> => {
  const existingPreview = await readTrackPreviewObject(objectKey, options)

  if (existingPreview !== null) {
    return existingPreview
  }

  await createTrackPreviewObject(objectKey, durationMs, options)
  const createdPreview = await readTrackPreviewObject(objectKey, options)

  if (createdPreview === null) {
    throw new Error('R2 track preview was not readable after creation')
  }

  return createdPreview
}
