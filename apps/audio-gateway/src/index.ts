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

type AudioGatewayEnv = Env & PlaybackSecrets

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

const createErrorResponse = (
  status: number,
  code: string,
  allowedOrigin: string | null,
): Response => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  applyCorsHeaders(headers, allowedOrigin)

  return Response.json({error: code}, {headers, status})
}

const getAllowedOrigin = (request: Request, environment: AudioGatewayEnv): string | null => {
  const origin = request.headers.get('Origin')

  if (origin === null) {
    return null
  }

  const allowedOrigins = environment.ALLOWED_ORIGINS.split(',').map((value) => value.trim())
  return allowedOrigins.includes(origin) ? origin : null
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
): CacheRequests => {
  const cacheUrl = new URL(request.url)
  cacheUrl.pathname = `${CACHE_PATH_PREFIX}${claims.objectKey}`
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
  const object = await environment.PAID_AUDIO.get(claims.objectKey)

  if (object === null) {
    return
  }

  await caches.default.put(cacheRequest, createObjectResponse(object, claims.assetId))
}

const handleOptions = (request: Request, allowedOrigin: string | null): Response => {
  if (request.headers.get('Origin') !== null && allowedOrigin === null) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'origin_not_allowed', allowedOrigin)
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
  const cacheRequests = createAudioCacheRequests(request, claims)
  const cachedResponse = await caches.default.match(cacheRequests.full)

  if (cachedResponse !== undefined) {
    const response = createClientResponse(cachedResponse, allowedOrigin, 'HIT')
    return new Response(null, {headers: response.headers, status: response.status})
  }

  const object = await environment.PAID_AUDIO.head(claims.objectKey)

  if (object === null) {
    return createErrorResponse(HTTP_NOT_FOUND, 'audio_not_found', allowedOrigin)
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
  const cacheRequests = createAudioCacheRequests(request, claims)
  const cachedResponse = await caches.default.match(cacheRequests.lookup)

  if (cachedResponse !== undefined) {
    return createClientResponse(cachedResponse, allowedOrigin, 'HIT')
  }

  const range = request.headers.get('Range')
  const object =
    range === null
      ? await environment.PAID_AUDIO.get(claims.objectKey)
      : await environment.PAID_AUDIO.get(claims.objectKey, {range: request.headers})

  if (object === null) {
    return createErrorResponse(HTTP_NOT_FOUND, 'audio_not_found', allowedOrigin)
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
  allowedOrigin: string | null,
): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return handleOptions(request, allowedOrigin)
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return createErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'method_not_allowed', allowedOrigin)
  }

  const url = new URL(request.url)
  const assetId = AUDIO_PATH_REGEXP.exec(url.pathname)?.groups?.assetId

  if (assetId === undefined) {
    return createErrorResponse(HTTP_NOT_FOUND, 'route_not_found', allowedOrigin)
  }

  const requestOrigin = request.headers.get('Origin')

  if (requestOrigin !== null && allowedOrigin === null) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'origin_not_allowed', allowedOrigin)
  }

  const claims = await authenticateRequest(url, environment)

  if (claims === null || claims.assetId !== assetId) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'invalid_playback_token', allowedOrigin)
  }

  return request.method === 'HEAD'
    ? handleHead(request, environment, claims, allowedOrigin)
    : handleGet({allowedOrigin, claims, context, environment, request})
}

export default {
  async fetch(request, environment, context): Promise<Response> {
    let allowedOrigin: string | null = null

    try {
      allowedOrigin = getAllowedOrigin(request, environment)
      return await handleRequest(request, environment, context, allowedOrigin)
    } catch (error) {
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'unknown_error',
          message: 'paid_audio_gateway_failed',
        }),
      )
      return createErrorResponse(HTTP_INTERNAL_SERVER_ERROR, 'gateway_failed', allowedOrigin)
    }
  },
} satisfies ExportedHandler<AudioGatewayEnv>
