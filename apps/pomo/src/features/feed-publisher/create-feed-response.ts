import {createHash} from 'node:crypto'

import {VERCEL_CDN_CACHE_CONTROL_HEADER} from '../../server/http/headers'

import type {FeedFormat, FeedProvider} from './contract'
import type {FeedRegistry} from './feed-registry'
import {normalizeFeed} from './normalize-feed'
import {renderAtom} from './render-atom'
import {renderRss} from './render-rss'

const BYTES_PER_KIBIBYTE = 1024
const MAX_DOCUMENT_KIBIBYTES = 512
const MAX_DOCUMENT_BYTES = MAX_DOCUMENT_KIBIBYTES * BYTES_PER_KIBIBYTE
const CACHE_SECONDS = 300
const STALE_SECONDS = 60
const HTTP_STATUS_PERMANENT_REDIRECT = 308
const HTTP_STATUS_METHOD_NOT_ALLOWED = 405
const HTTP_STATUS_NOT_FOUND = 404
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500

interface FeedLogger {
  readonly error: (message: string, cause: unknown) => void
}

export interface CreateFeedResponseOptions {
  readonly format: FeedFormat
  readonly logger?: FeedLogger
  readonly registry: FeedRegistry
  readonly request: Request
  readonly slug: string
}

const createUncachedResponse = (status: number, headers?: HeadersInit): Response =>
  new Response(null, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
    status,
  })

const createCanonicalRedirect = (request: Request): Response | undefined => {
  const url = new URL(request.url)

  if (url.search.length === 0) {
    return undefined
  }

  url.search = ''
  return createUncachedResponse(HTTP_STATUS_PERMANENT_REDIRECT, {Location: url.toString()})
}

const getContentType = (format: FeedFormat): string =>
  format === 'rss' ? 'application/rss+xml; charset=utf-8' : 'application/atom+xml; charset=utf-8'

const renderDocument = (format: FeedFormat, input: Parameters<typeof renderRss>[0]): string =>
  format === 'rss' ? renderRss(input) : renderAtom(input)

interface DocumentHeadersOptions {
  readonly cachePolicy: FeedProvider['cachePolicy']
  readonly document: string
  readonly format: FeedFormat
  readonly slug: string
  readonly updatedAt: string
}

const createDocumentHeaders = (
  options: DocumentHeadersOptions,
): {readonly entityTag: string; readonly headers: Headers} => {
  const {cachePolicy, document, format, slug, updatedAt} = options
  const entityTag = `"${createHash('sha256').update(document).digest('base64url')}"`

  return {
    entityTag,
    headers: new Headers({
      'Cache-Control': cachePolicy === 'no-store' ? 'no-store' : `public, max-age=${CACHE_SECONDS}`,
      'Content-Type': getContentType(format),
      ETag: entityTag,
      'Last-Modified': new Date(updatedAt).toUTCString(),
      [VERCEL_CDN_CACHE_CONTROL_HEADER]:
        cachePolicy === 'no-store'
          ? 'no-store'
          : `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${STALE_SECONDS}`,
      'Vercel-Cache-Tag': `feed:${slug}`,
      'X-Content-Type-Options': 'nosniff',
    }),
  }
}

const matchesEntityTag = (request: Request, entityTag: string): boolean =>
  request.headers
    .get('If-None-Match')
    ?.split(',')
    .some((candidate) => candidate.trim() === entityTag) ?? false

/** Resolves a provider and returns its RSS or Atom representation with its cache policy. */
export const createFeedResponse = async (options: CreateFeedResponseOptions): Promise<Response> => {
  if (options.request.method !== 'GET' && options.request.method !== 'HEAD') {
    return createUncachedResponse(HTTP_STATUS_METHOD_NOT_ALLOWED, {Allow: 'GET, HEAD'})
  }

  const redirect = createCanonicalRedirect(options.request)

  if (redirect !== undefined) {
    return redirect
  }

  const provider = options.registry.getProvider(options.slug)

  if (provider === undefined) {
    return createUncachedResponse(HTTP_STATUS_NOT_FOUND)
  }

  try {
    const feed = normalizeFeed(await provider.listEntries())
    const requestUrl = new URL(options.request.url)
    const selfUrl = new URL(requestUrl.pathname, provider.definition.homeUrl).toString()
    const document = renderDocument(options.format, {
      definition: provider.definition,
      entries: feed.entries,
      selfUrl,
      updatedAt: feed.updatedAt,
    })

    if (new TextEncoder().encode(document).byteLength > MAX_DOCUMENT_BYTES) {
      throw new RangeError('Serialized feed exceeds 512 KiB')
    }

    const {entityTag, headers} = createDocumentHeaders({
      cachePolicy: provider.cachePolicy,
      document,
      format: options.format,
      slug: options.slug,
      updatedAt: feed.updatedAt,
    })

    if (matchesEntityTag(options.request, entityTag)) {
      return new Response(null, {headers, status: 304})
    }

    return new Response(options.request.method === 'HEAD' ? null : document, {headers})
  } catch (cause) {
    const logger = options.logger ?? console
    logger.error(`Failed to render feed: ${options.slug}`, cause)
    return createUncachedResponse(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}
