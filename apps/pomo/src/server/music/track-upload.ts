import {AwsClient} from 'aws4fetch'
import {parseWebStream} from 'music-metadata'

import {extractMp3Preview} from './mp3-preview'

const DEFAULT_BUCKET = 'pomofi-paid-audio'
const UPLOAD_EXPIRY_SECONDS = 900
const PLAYBACK_EXPIRY_SECONDS = 900
const MILLISECONDS_PER_SECOND = 1000
const PREVIEW_DURATION_SECONDS = 30
// oxlint-disable-next-line eslint/no-magic-numbers -- Preview parsing input is capped at two MiB.
const MAXIMUM_PREVIEW_INPUT_BYTES = 2 * 1024 * 1024
const PREVIEW_DURATION_MS = PREVIEW_DURATION_SECONDS * MILLISECONDS_PER_SECOND
const HTTP_NOT_FOUND = 404
// oxlint-disable-next-line eslint/no-magic-numbers -- Paid source MP3 limit is 250 MiB.
export const MAXIMUM_TRACK_BYTES = 250 * 1024 * 1024

interface PaidAudioEnvironment {
  readonly CLOUDFLARE_R2_ACCOUNT_ID?: string
  readonly POMO_PAID_AUDIO_R2_ACCESS_KEY_ID?: string
  readonly POMO_PAID_AUDIO_R2_BUCKET?: string
  readonly POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY?: string
  readonly POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID?: string
  readonly POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY?: string
}

interface TrackUploadOptions {
  readonly environment?: PaidAudioEnvironment
  readonly signRequest?: (request: Request, signQuery: boolean) => Promise<Request>
}

interface ParsedAudio {
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

interface TrackPreviewOptions extends TrackUploadOptions {
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
  readonly durationMs: number
  readonly etag: string
  readonly sizeBytes: bigint
}

export interface TrackPreviewObject {
  readonly body: ReadableStream<Uint8Array>
  readonly contentLength: number
  readonly etag: string | null
}

const TRACK_VALIDATION_FAILURE_CODES = new Set([
  'invalid_mp3',
  'invalid_mp3_frames',
  'invalid_mp3_id3',
  'invalid_track_metadata',
])

export const isTrackValidationError = (error: unknown): error is TypeError =>
  error instanceof TypeError && TRACK_VALIDATION_FAILURE_CODES.has(error.message)

const requireEnvironmentValue = (
  name: keyof PaidAudioEnvironment,
  value: string | undefined,
): string => {
  const normalizedValue = value?.trim()

  if (normalizedValue === undefined || normalizedValue.length === 0) {
    throw new TypeError(`${name} is not set`)
  }

  return normalizedValue
}

const createObjectUrl = (objectKey: string, environment: PaidAudioEnvironment): URL => {
  const accountId = requireEnvironmentValue(
    'CLOUDFLARE_R2_ACCOUNT_ID',
    environment.CLOUDFLARE_R2_ACCOUNT_ID,
  )
  const bucket = environment.POMO_PAID_AUDIO_R2_BUCKET?.trim() || DEFAULT_BUCKET
  return new URL(`/${bucket}/${objectKey}`, `https://${accountId}.r2.cloudflarestorage.com`)
}

const createSigner = (environment: PaidAudioEnvironment) => {
  const client = new AwsClient({
    accessKeyId: requireEnvironmentValue(
      'POMO_PAID_AUDIO_R2_ACCESS_KEY_ID',
      environment.POMO_PAID_AUDIO_R2_ACCESS_KEY_ID ??
        environment.POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID,
    ),
    region: 'auto',
    secretAccessKey: requireEnvironmentValue(
      'POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY',
      environment.POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY ??
        environment.POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY,
    ),
    service: 's3',
  })

  return (request: Request, signQuery: boolean): Promise<Request> =>
    client.sign(request, {aws: {signQuery}})
}

const signObjectRequest = (
  request: Request,
  environment: PaidAudioEnvironment,
  signQuery: boolean,
  signer?: TrackUploadOptions['signRequest'],
) => (signer ?? createSigner(environment))(request, signQuery)

export const createTrackPreviewKey = (objectKey: string): string => {
  if (!objectKey.endsWith('/source.mp3')) {
    throw new TypeError('invalid_track_object_key')
  }

  return `${objectKey.slice(0, -'source.mp3'.length)}preview-v1.mp3`
}

const createLegacyTrackPreviewKey = (objectKey: string): string =>
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

export const createTrackUpload = async (
  objectKey: string,
  options: TrackUploadOptions = {},
): Promise<TrackUpload> => {
  const environment = options.environment ?? process.env
  const objectUrl = createObjectUrl(objectKey, environment)
  objectUrl.searchParams.set('X-Amz-Expires', UPLOAD_EXPIRY_SECONDS.toString())
  const request = new Request(objectUrl, {
    headers: {'Content-Type': 'audio/mpeg'},
    method: 'PUT',
  })
  const signedRequest = await signObjectRequest(request, environment, true, options.signRequest)

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
  const objectUrl = createObjectUrl(objectKey, environment)
  objectUrl.searchParams.set('X-Amz-Expires', PLAYBACK_EXPIRY_SECONDS.toString())
  const request = new Request(objectUrl)
  const signedRequest = await signObjectRequest(request, environment, true, options.signRequest)

  return {
    expiresAt: new Date(Date.now() + PLAYBACK_EXPIRY_SECONDS * MILLISECONDS_PER_SECOND),
    url: signedRequest.url,
  }
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
  const sourceRequest = new Request(createObjectUrl(objectKey, environment), {
    headers: {Range: `bytes=0-${MAXIMUM_PREVIEW_INPUT_BYTES - 1}`},
  })
  const signedSourceRequest = await signObjectRequest(
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
    createObjectUrl(createTrackPreviewKey(objectKey), environment),
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
  const signedPreviewRequest = await signObjectRequest(
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
  const request = new Request(createObjectUrl(createTrackPreviewKey(objectKey), environment))
  const signedRequest = await signObjectRequest(request, environment, false, options.signRequest)
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

export const inspectTrackUpload = async (
  objectKey: string,
  options: InspectTrackOptions = {},
): Promise<TrackInspection> => {
  const environment = options.environment ?? process.env
  const request = new Request(createObjectUrl(objectKey, environment))
  const signedRequest = await signObjectRequest(request, environment, false, options.signRequest)
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
    options.parseAudio ??
    ((stream, fileInfo) => parseWebStream(stream, fileInfo, {duration: true, skipCovers: true}))
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

  return {
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
      const request = new Request(createObjectUrl(targetKey, environment), {method: 'DELETE'})
      const signedRequest = await signObjectRequest(
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
