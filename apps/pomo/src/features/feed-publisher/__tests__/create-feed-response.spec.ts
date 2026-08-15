import {describe, expect, it, vi} from 'vitest'

import type {FeedEntry, FeedProvider} from '../contract'
import {createFeedResponse} from '../create-feed-response'
import {createFeedRegistry} from '../feed-registry'

const ENTRY: FeedEntry = {
  contentHtml: '<p>본문</p>',
  id: 'urn:pomo:history:one',
  publishedAt: '2026-08-15T00:00:00.000Z',
  summary: '역사적 순간의 요약',
  title: '역사적 순간',
  updatedAt: '2026-08-15T01:00:00.000Z',
  url: 'https://pomo.example/feeds/today-in-history#one',
}

const createProvider = (listEntries = async (): Promise<ReadonlyArray<FeedEntry>> => [ENTRY]) =>
  ({
    definition: {
      description: '오늘과 같은 날짜의 역사적 순간',
      homeUrl: 'https://pomo.example/feeds',
      language: 'ko-KR',
      slug: 'today-in-history',
      title: '오늘 있었던 역사적 순간',
    },
    listEntries,
  }) satisfies FeedProvider

const createResponse = (
  request: Request,
  provider: FeedProvider = createProvider(),
  logger?: {readonly error: (message: string, cause: unknown) => void},
) =>
  createFeedResponse({
    format: request.url.includes('atom.xml') ? 'atom' : 'rss',
    logger,
    registry: createFeedRegistry([provider]),
    request,
    slug: 'today-in-history',
  })

describe('createFeedResponse', () => {
  it('should return a cacheable RSS document with validators', async () => {
    const response = await createResponse(
      new Request('https://pomo.example/feeds/today-in-history/rss.xml'),
    )

    expect(response.status).toBe(200)
    await expect(response.text()).resolves.toContain('<rss version="2.0"')
    expect(response.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=900')
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe(
      'public, s-maxage=21600, stale-while-revalidate=86400',
    )
    expect(response.headers.get('Vercel-Cache-Tag')).toBe('feed:today-in-history')
    expect(response.headers.get('ETag')).toMatch(/^"[\w-]+"$/u)
    expect(response.headers.get('Last-Modified')).toBe('Sat, 15 Aug 2026 01:00:00 GMT')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.has('Set-Cookie')).toBe(false)
  })

  it('should return Atom with the Atom content type', async () => {
    const response = await createResponse(
      new Request('https://pomo.example/feeds/today-in-history/atom.xml'),
    )

    await expect(response.text()).resolves.toContain('<feed xmlns="http://www.w3.org/2005/Atom"')
    expect(response.headers.get('Content-Type')).toBe('application/atom+xml; charset=utf-8')
  })

  it('should use the provider origin for a production canonical self URL', async () => {
    const response = await createResponse(
      new Request('https://deployment.vercel.app/feeds/today-in-history/rss.xml'),
    )

    await expect(response.text()).resolves.toContain(
      'href="https://pomo.example/feeds/today-in-history/rss.xml" rel="self"',
    )
  })

  it('should return matching headers without a body for HEAD', async () => {
    const url = 'https://pomo.example/feeds/today-in-history/rss.xml'
    const getResponse = await createResponse(new Request(url))
    const headResponse = await createResponse(new Request(url, {method: 'HEAD'}))

    expect(headResponse.status).toBe(200)
    expect(headResponse.headers.get('ETag')).toBe(getResponse.headers.get('ETag'))
    await expect(headResponse.text()).resolves.toBe('')
  })

  it('should return 304 when the request entity tag matches', async () => {
    const url = 'https://pomo.example/feeds/today-in-history/rss.xml'
    const firstResponse = await createResponse(new Request(url))
    const entityTag = firstResponse.headers.get('ETag')

    if (entityTag === null) {
      throw new Error('Expected an ETag')
    }

    const response = await createResponse(
      new Request(url, {headers: {'If-None-Match': `"other", ${entityTag}`}}),
    )

    expect(response.status).toBe(304)
    await expect(response.text()).resolves.toBe('')
  })

  it('should redirect query variants to the canonical URL without long-lived caching', async () => {
    const response = await createResponse(
      new Request('https://pomo.example/feeds/today-in-history/rss.xml?source=reader'),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('Location')).toBe(
      'https://pomo.example/feeds/today-in-history/rss.xml',
    )
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.has('Vercel-CDN-Cache-Control')).toBe(false)
  })

  it('should return 404 for an unknown feed', async () => {
    const request = new Request('https://pomo.example/feeds/unknown/rss.xml')
    const response = await createFeedResponse({
      format: 'rss',
      registry: createFeedRegistry([]),
      request,
      slug: 'unknown',
    })

    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('should return 405 with the supported methods', async () => {
    const response = await createResponse(
      new Request('https://pomo.example/feeds/today-in-history/rss.xml', {method: 'POST'}),
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, HEAD')
  })

  it('should conceal provider errors and log their cause', async () => {
    const cause = new Error('database unavailable')
    const logger = {error: vi.fn()}
    const provider = createProvider(async () => Promise.reject(cause))
    const response = await createResponse(
      new Request('https://pomo.example/feeds/today-in-history/rss.xml'),
      provider,
      logger,
    )

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(logger.error).toHaveBeenCalledWith('Failed to render feed: today-in-history', cause)
  })

  it('should use the console logger when no logger is provided', async () => {
    const cause = new Error('provider failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const provider = createProvider(async () => Promise.reject(cause))

    try {
      const response = await createResponse(
        new Request('https://pomo.example/feeds/today-in-history/rss.xml'),
        provider,
      )

      expect(response.status).toBe(500)
      expect(consoleError).toHaveBeenCalledWith('Failed to render feed: today-in-history', cause)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('should reject a serialized document larger than 512 KiB', async () => {
    const logger = {error: vi.fn()}
    const provider = createProvider(async () => [{...ENTRY, contentHtml: '가'.repeat(512 * 1024)}])
    const response = await createResponse(
      new Request('https://pomo.example/feeds/today-in-history/rss.xml'),
      provider,
      logger,
    )

    expect(response.status).toBe(500)
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to render feed: today-in-history',
      expect.any(RangeError),
    )
  })
})
