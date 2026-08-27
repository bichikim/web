import {type PlaybackTokenClaims, verifyPlaybackToken} from '@pomo/playback-token'

const AUDIO_PATH_REGEXP =
  /^\/tracks\/(?<assetId>[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/source\.mp3$/u
const CACHE_PATH_PREFIX = '/_pomo_paid_audio_cache/'
const EDGE_CACHE_SECONDS = 31_536_000
const BROWSER_CACHE_SECONDS = 3600
const HTTP_NO_CONTENT = 204
const HTTP_PARTIAL_CONTENT = 206
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405
const HTTP_RANGE_NOT_SATISFIABLE = 416
const HTTP_INTERNAL_SERVER_ERROR = 500

interface PlaybackSecrets {
  readonly PLAYBACK_TOKEN_SECRET: string
}

interface AudioGatewayVariables {
  readonly ALLOWED_ORIGINS: string
  readonly ALLOWED_ORIGIN_SUFFIXES: string
  readonly R2_OBJECT_PREFIX: string
}

interface AudioGatewayEnv
  extends Omit<Env, keyof AudioGatewayVariables>, AudioGatewayVariables, PlaybackSecrets {}

interface CacheRequests {
  readonly full: Request
  readonly lookup: Request
}

interface HandleGetOptions {
  readonly allowedOrigin: string | null
  readonly claims: PlaybackTokenClaims
  readonly context: ExecutionContext
  readonly environment: AudioGatewayEnv
  readonly request: Request
}

const createErrorResponse = (status: number, code: string): Response =>
  Response.json(
    {error: code},
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
      status,
    },
  )

const getAllowedOrigin = (request: Request, environment: AudioGatewayEnv): string | null => {
  const origin = request.headers.get('Origin')

  if (origin === null) {
    return null
  }

  const allowedOrigins = environment.ALLOWED_ORIGINS.split(',').map((value) => value.trim())

  if (allowedOrigins.includes(origin)) {
    return origin
  }

  const allowedSuffixes = environment.ALLOWED_ORIGIN_SUFFIXES.split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  try {
    const originUrl = new URL(origin)
    const allowedBySuffix = allowedSuffixes.some(
      (suffix) =>
        suffix.startsWith('.') &&
        originUrl.protocol === 'https:' &&
        originUrl.port.length === 0 &&
        originUrl.hostname.length > suffix.length &&
        originUrl.hostname.endsWith(suffix),
    )
    return allowedBySuffix ? origin : null
  } catch {
    return null
  }
}

const STORAGE_PREFIX_SEGMENT_PATTERN = /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/u

const normalizeObjectKeyPrefix = (value: string): string => {
  const trimmedValue = value.trim()
  let startIndex = 0

  while (trimmedValue[startIndex] === '/') {
    startIndex += 1
  }

  let endIndex = trimmedValue.length

  while (endIndex > startIndex && trimmedValue[endIndex - 1] === '/') {
    endIndex -= 1
  }

  return trimmedValue.slice(startIndex, endIndex)
}

const createStorageObjectKey = (objectKey: string, environment: AudioGatewayEnv): string => {
  const normalizedPrefix = normalizeObjectKeyPrefix(environment.R2_OBJECT_PREFIX)

  if (normalizedPrefix.length === 0) {
    return objectKey
  }

  if (
    normalizedPrefix.split('/').some((segment) => !STORAGE_PREFIX_SEGMENT_PATTERN.test(segment))
  ) {
    throw new TypeError('R2_OBJECT_PREFIX is invalid')
  }

  return `${normalizedPrefix}/${objectKey}`
}

const applyCorsHeaders = (headers: Headers, allowedOrigin: string | null): void => {
  if (allowedOrigin === null) {
    return
  }

  headers.set('Access-Control-Allow-Origin', allowedOrigin)
  headers.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, ETag')
  headers.append('Vary', 'Origin')
}

export const createAudioCacheRequests = (
  request: Request,
  claims: PlaybackTokenClaims,
  objectKeyPrefix = '',
): CacheRequests => {
  const cacheUrl = new URL(request.url)
  const normalizedPrefix = normalizeObjectKeyPrefix(objectKeyPrefix)
  const cacheObjectKey =
    normalizedPrefix.length === 0 ? claims.objectKey : `${normalizedPrefix}/${claims.objectKey}`
  cacheUrl.pathname = `${CACHE_PATH_PREFIX}${cacheObjectKey}`
  cacheUrl.search = ''
  const full = new Request(cacheUrl, {method: 'GET'})
  const range = request.headers.get('Range')

  return range === null
    ? {full, lookup: full}
    : {full, lookup: new Request(cacheUrl, {headers: {Range: range}, method: 'GET'})}
}

const createClientResponse = (
  response: Response,
  allowedOrigin: string | null,
  cacheStatus: 'HIT' | 'MISS',
): Response => {
  const headers = new Headers(response.headers)
  headers.set(
    'Cache-Control',
    response.ok ? `private, max-age=${BROWSER_CACHE_SECONDS}` : 'no-store',
  )
  headers.set('X-Pomo-Cache', cacheStatus)
  applyCorsHeaders(headers, allowedOrigin)
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}

const createObjectHeaders = (object: R2Object, assetId: string): Headers => {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', `public, s-maxage=${EDGE_CACHE_SECONDS}, immutable`)
  headers.set('Cache-Tag', `paid-audio-${assetId}`)
  headers.set('Content-Type', 'audio/mpeg')
  headers.set('ETag', object.httpEtag)
  headers.set('X-Content-Type-Options', 'nosniff')
  return headers
}

const createObjectResponse = (object: R2ObjectBody, assetId: string): Response => {
  const headers = createObjectHeaders(object, assetId)
  headers.set('Content-Length', object.size.toString())
  return new Response(object.body, {headers})
}

const createRangeNotSatisfiableResponse = async (
  object: R2ObjectBody,
  assetId: string,
): Promise<Response> => {
  await object.body.cancel().catch(() => undefined)
  const headers = createObjectHeaders(object, assetId)
  headers.set('Content-Range', `bytes */${object.size}`)
  return new Response(null, {headers, status: HTTP_RANGE_NOT_SATISFIABLE})
}

const createRangedObjectResponse = async (
  object: R2ObjectBody,
  assetId: string,
): Promise<Response> => {
  const {range} = object

  if (range === undefined) {
    return createRangeNotSatisfiableResponse(object, assetId)
  }

  const normalizedRange: {length?: number; offset?: number; suffix?: number} = {...range}
  const requestedLength =
    normalizedRange.suffix === undefined
      ? (normalizedRange.length ?? object.size - (normalizedRange.offset ?? 0))
      : Math.min(normalizedRange.suffix, object.size)
  const offset =
    normalizedRange.suffix === undefined
      ? (normalizedRange.offset ?? 0)
      : object.size - requestedLength
  const contentLength = Math.min(requestedLength, object.size - offset)

  if (
    object.size === 0 ||
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(contentLength) ||
    offset < 0 ||
    offset >= object.size ||
    contentLength <= 0
  ) {
    return createRangeNotSatisfiableResponse(object, assetId)
  }

  const headers = createObjectHeaders(object, assetId)
  headers.set('Content-Length', contentLength.toString())
  headers.set('Content-Range', `bytes ${offset}-${offset + contentLength - 1}/${object.size}`)
  return new Response(object.body, {headers, status: HTTP_PARTIAL_CONTENT})
}

const cacheFullObject = async (
  environment: AudioGatewayEnv,
  claims: PlaybackTokenClaims,
  cacheRequest: Request,
): Promise<void> => {
  const object = await environment.PAID_AUDIO.get(
    createStorageObjectKey(claims.objectKey, environment),
  )

  if (object === null) {
    return
  }

  await caches.default.put(cacheRequest, createObjectResponse(object, claims.assetId))
}

const handleOptions = (request: Request, environment: AudioGatewayEnv): Response => {
  const allowedOrigin = getAllowedOrigin(request, environment)

  if (request.headers.get('Origin') !== null && allowedOrigin === null) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'origin_not_allowed')
  }

  const headers = new Headers({
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
  })
  applyCorsHeaders(headers, allowedOrigin)
  return new Response(null, {headers, status: HTTP_NO_CONTENT})
}

const authenticateRequest = async (
  url: URL,
  environment: AudioGatewayEnv,
): Promise<PlaybackTokenClaims | null> => {
  const token = url.searchParams.get('token')
  const secret = environment.PLAYBACK_TOKEN_SECRET.trim()

  return token === null
    ? null
    : verifyPlaybackToken(token, {
        scope: 'full',
        secret,
      })
}

const handleHead = async (
  request: Request,
  environment: AudioGatewayEnv,
  claims: PlaybackTokenClaims,
  allowedOrigin: string | null,
): Promise<Response> => {
  const cacheRequests = createAudioCacheRequests(request, claims, environment.R2_OBJECT_PREFIX)
  const cachedResponse = await caches.default.match(cacheRequests.full)

  if (cachedResponse !== undefined) {
    const response = createClientResponse(cachedResponse, allowedOrigin, 'HIT')
    return new Response(null, {headers: response.headers, status: response.status})
  }

  const object = await environment.PAID_AUDIO.head(
    createStorageObjectKey(claims.objectKey, environment),
  )

  if (object === null) {
    return createErrorResponse(HTTP_NOT_FOUND, 'audio_not_found')
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', `private, max-age=${BROWSER_CACHE_SECONDS}`)
  headers.set('Content-Length', object.size.toString())
  headers.set('Content-Type', 'audio/mpeg')
  headers.set('ETag', object.httpEtag)
  applyCorsHeaders(headers, allowedOrigin)
  return new Response(null, {headers})
}

const handleGet = async ({
  allowedOrigin,
  claims,
  context,
  environment,
  request,
}: HandleGetOptions): Promise<Response> => {
  const cacheRequests = createAudioCacheRequests(request, claims, environment.R2_OBJECT_PREFIX)
  const cachedResponse = await caches.default.match(cacheRequests.lookup)

  if (cachedResponse !== undefined) {
    return createClientResponse(cachedResponse, allowedOrigin, 'HIT')
  }

  const range = request.headers.get('Range')
  const storageObjectKey = createStorageObjectKey(claims.objectKey, environment)
  const object =
    range === null
      ? await environment.PAID_AUDIO.get(storageObjectKey)
      : await environment.PAID_AUDIO.get(storageObjectKey, {range: request.headers})

  if (object === null) {
    return createErrorResponse(HTTP_NOT_FOUND, 'audio_not_found')
  }

  if (range !== null) {
    const objectResponse = await createRangedObjectResponse(object, claims.assetId)

    if (objectResponse.ok) {
      context.waitUntil(cacheFullObject(environment, claims, cacheRequests.full))
    }

    return createClientResponse(objectResponse, allowedOrigin, 'MISS')
  }

  const objectResponse = createObjectResponse(object, claims.assetId)
  const cacheResponse = objectResponse.clone()
  context.waitUntil(caches.default.put(cacheRequests.full, cacheResponse))
  return createClientResponse(objectResponse, allowedOrigin, 'MISS')
}

const handleRequest = async (
  request: Request,
  environment: AudioGatewayEnv,
  context: ExecutionContext,
): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request, environment)
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return createErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'method_not_allowed')
  }

  const url = new URL(request.url)
  const assetId = AUDIO_PATH_REGEXP.exec(url.pathname)?.groups?.assetId

  if (assetId === undefined) {
    return createErrorResponse(HTTP_NOT_FOUND, 'route_not_found')
  }

  const requestOrigin = request.headers.get('Origin')
  const allowedOrigin = getAllowedOrigin(request, environment)

  if (requestOrigin !== null && allowedOrigin === null) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'origin_not_allowed')
  }

  const claims = await authenticateRequest(url, environment)

  if (claims === null || claims.assetId !== assetId) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'invalid_playback_token')
  }

  return request.method === 'HEAD'
    ? handleHead(request, environment, claims, allowedOrigin)
    : handleGet({allowedOrigin, claims, context, environment, request})
}

export default {
  async fetch(request, environment, context): Promise<Response> {
    try {
      return await handleRequest(request, environment, context)
    } catch (error) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'unknown_error',
          message: 'paid_audio_gateway_failed',
        }),
      )
      return createErrorResponse(HTTP_INTERNAL_SERVER_ERROR, 'gateway_failed')
    }
  },
} satisfies ExportedHandler<AudioGatewayEnv>
