import {applyCorsHeaders} from './cors'

const CACHE_PATH_PREFIX = '/_pomo_paid_audio_cache/'
const BROWSER_CACHE_SECONDS = 3600

interface CacheRequests {
  readonly full: Request
  readonly lookup: Request
}

export const createAudioCacheRequests = (
  request: Request,
  storageObjectKey: string,
  range: string | null = request.headers.get('Range'),
): CacheRequests => {
  const cacheUrl = new URL(request.url)
  cacheUrl.pathname = `${CACHE_PATH_PREFIX}${storageObjectKey}`
  cacheUrl.search = ''
  const full = new Request(cacheUrl, {method: 'GET'})
  return range === null
    ? {full, lookup: full}
    : {full, lookup: new Request(cacheUrl, {headers: {Range: range}, method: 'GET'})}
}

export const createClientResponse = (
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
