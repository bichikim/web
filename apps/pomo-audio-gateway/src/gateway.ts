import {type PlaybackTokenClaims, verifyPlaybackToken} from '@pomo/playback-token'

import {createAudioCacheRequests, createClientResponse} from './cache'
import {applyCorsHeaders, getAllowedOrigin} from './cors'
import {createErrorResponse, createPreflightResponse} from './http'
import {
  createHeadObjectResponse,
  createObjectResponse,
  createRangedObjectResponse,
  createStorageObjectKey,
  isSingleByteRange,
} from './storage'

const AUDIO_PATH_REGEXP =
  /^\/tracks\/(?<assetId>[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/source\.mp3$/u
const HTTP_UNAUTHORIZED = 401
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405
const HTTP_INTERNAL_SERVER_ERROR = 500

export interface AudioGatewayConfig {
  readonly allowedOrigins: string
  readonly allowedOriginSuffixes: string
  readonly playbackTokenSecret: string
  readonly storagePrefix: string
}

export interface AudioCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

export interface AudioStorage {
  get(key: string, options?: {readonly range: Headers}): Promise<R2ObjectBody | null>
  head(key: string): Promise<R2Object | null>
}

export interface AudioGatewayOptions {
  readonly cache: AudioCache
  readonly config: AudioGatewayConfig
  readonly request: Request
  readonly storage: AudioStorage
  readonly waitUntil: (promise: Promise<void>) => void
}

interface AuthenticatedOptions extends AudioGatewayOptions {
  readonly allowedOrigin: string | null
  readonly claims: PlaybackTokenClaims
  readonly storageObjectKey: string
}

interface CacheFullObjectOptions {
  readonly cache: AudioCache
  readonly cacheRequest: Request
  readonly claims: PlaybackTokenClaims
  readonly storage: AudioStorage
  readonly storageObjectKey: string
}

const authenticateRequest = async (
  url: URL,
  config: AudioGatewayConfig,
): Promise<PlaybackTokenClaims | null> => {
  const token = url.searchParams.get('token')
  const secret = config.playbackTokenSecret.trim()

  return token === null
    ? null
    : verifyPlaybackToken(token, {
        scope: 'full',
        secret,
      })
}

const cacheFullObject = async ({
  cache,
  cacheRequest,
  claims,
  storage,
  storageObjectKey,
}: CacheFullObjectOptions): Promise<void> => {
  const object = await storage.get(storageObjectKey)

  if (object === null) {
    return
  }

  await cache.put(cacheRequest, createObjectResponse(object, claims.assetId))
}

const handleHead = async ({
  allowedOrigin,
  cache,
  claims,
  config,
  request,
  storage,
  storageObjectKey,
}: AuthenticatedOptions): Promise<Response> => {
  const cacheRequests = createAudioCacheRequests(request, storageObjectKey)
  const cachedResponse = await cache.match(cacheRequests.full)

  if (cachedResponse !== undefined) {
    const response = createClientResponse(cachedResponse, allowedOrigin, 'HIT')
    return new Response(null, {headers: response.headers, status: response.status})
  }

  const object = await storage.head(storageObjectKey)

  if (object === null) {
    return createErrorResponse(HTTP_NOT_FOUND, 'audio_not_found', allowedOrigin)
  }

  const objectResponse = createHeadObjectResponse(object)
  const headers = new Headers(objectResponse.headers)
  applyCorsHeaders(headers, allowedOrigin)
  return new Response(null, {headers, status: objectResponse.status})
}

const handleGet = async ({
  allowedOrigin,
  cache,
  claims,
  config,
  request,
  storage,
  storageObjectKey,
  waitUntil,
}: AuthenticatedOptions): Promise<Response> => {
  const requestedRange = request.headers.get('Range')
  const range = requestedRange !== null && isSingleByteRange(requestedRange) ? requestedRange : null
  const cacheRequests = createAudioCacheRequests(request, storageObjectKey, range)
  const cachedResponse = await cache.match(cacheRequests.lookup)

  if (cachedResponse !== undefined) {
    return createClientResponse(cachedResponse, allowedOrigin, 'HIT')
  }

  const object =
    range === null
      ? await storage.get(storageObjectKey)
      : await storage.get(storageObjectKey, {range: request.headers})

  if (object === null) {
    return createErrorResponse(HTTP_NOT_FOUND, 'audio_not_found', allowedOrigin)
  }

  if (range !== null) {
    const objectResponse = await createRangedObjectResponse(object, claims.assetId, range)

    if (objectResponse.ok) {
      waitUntil(
        cacheFullObject({
          cache,
          cacheRequest: cacheRequests.full,
          claims,
          storage,
          storageObjectKey,
        }),
      )
    }

    return createClientResponse(objectResponse, allowedOrigin, 'MISS')
  }

  const objectResponse = createObjectResponse(object, claims.assetId)
  const cacheResponse = objectResponse.clone()
  waitUntil(cache.put(cacheRequests.full, cacheResponse))
  return createClientResponse(objectResponse, allowedOrigin, 'MISS')
}

const handleRequest = async (
  {cache, config, request, storage, waitUntil}: AudioGatewayOptions,
  allowedOrigin: string | null,
): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return request.headers.get('Origin') !== null && allowedOrigin === null
      ? createErrorResponse(HTTP_UNAUTHORIZED, 'origin_not_allowed', allowedOrigin)
      : createPreflightResponse(allowedOrigin)
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return createErrorResponse(HTTP_METHOD_NOT_ALLOWED, 'method_not_allowed', allowedOrigin)
  }

  const url = new URL(request.url)
  const assetId = AUDIO_PATH_REGEXP.exec(url.pathname)?.groups?.assetId

  if (assetId === undefined) {
    return createErrorResponse(HTTP_NOT_FOUND, 'route_not_found', allowedOrigin)
  }

  if (request.headers.get('Origin') !== null && allowedOrigin === null) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'origin_not_allowed', allowedOrigin)
  }

  const claims = await authenticateRequest(url, config)

  if (claims === null || claims.assetId !== assetId) {
    return createErrorResponse(HTTP_UNAUTHORIZED, 'invalid_playback_token', allowedOrigin)
  }

  const storageObjectKey = createStorageObjectKey(claims.objectKey, config.storagePrefix)

  return request.method === 'HEAD'
    ? handleHead({
        allowedOrigin,
        cache,
        claims,
        config,
        request,
        storage,
        storageObjectKey,
        waitUntil,
      })
    : handleGet({
        allowedOrigin,
        cache,
        claims,
        config,
        request,
        storage,
        storageObjectKey,
        waitUntil,
      })
}

export const handleAudioGatewayRequest = async (
  options: AudioGatewayOptions,
): Promise<Response> => {
  let allowedOrigin: string | null = null

  try {
    allowedOrigin = getAllowedOrigin(options.request, {
      allowedOrigins: options.config.allowedOrigins,
      allowedOriginSuffixes: options.config.allowedOriginSuffixes,
    })
    return await handleRequest(options, allowedOrigin)
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'unknown_error',
        message: 'paid_audio_gateway_failed',
      }),
    )
    return createErrorResponse(HTTP_INTERNAL_SERVER_ERROR, 'gateway_failed', allowedOrigin)
  }
}
