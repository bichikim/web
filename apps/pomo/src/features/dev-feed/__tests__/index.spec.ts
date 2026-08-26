import type {IncomingMessage, ServerResponse} from 'node:http'

import {describe, expect, it, vi} from 'vitest'

import {createDevFeedDocument, createDevFeedPlugin} from '..'

const ORIGIN = 'http://localhost:3200'

type DevFeedMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void

const getMiddleware = () => {
  const use = vi.fn<(middleware: DevFeedMiddleware) => void>()
  const plugin = createDevFeedPlugin()

  plugin.configureServer({middlewares: {use}})

  const middleware = use.mock.calls[0]?.[0]
  if (middleware === undefined) {
    throw new Error('개발 피드 미들웨어가 등록되지 않았어요.')
  }

  return {middleware, plugin, use}
}

const createResponse = () => {
  const end = vi.fn()
  const setHeader = vi.fn()
  const response = {end, setHeader, statusCode: 0} as unknown as ServerResponse

  return {end, response, setHeader}
}

const createRequest = (
  method: string,
  url: string | undefined,
  headers: IncomingMessage['headers'] = {},
) => ({headers, method, url}) as IncomingMessage

describe('createDevFeedDocument', () => {
  it('should create an RSS snapshot aligned to the latest five-minute boundary', () => {
    const document = createDevFeedDocument({
      format: 'rss',
      now: new Date('2026-05-04T13:34:43.000Z'),
      origin: ORIGIN,
    })

    expect(document).toMatch(/<title>“[^”]+” — [^<]+ · 2026년 5월 4일 22시 30분<\/title>/u)
    expect(document).toContain('<pubDate>Mon, 04 May 2026 13:30:00 GMT</pubDate>')
    expect(document).toContain('href="http://localhost:3200/__dev/feeds/rss.xml"')
    expect(document.match(/<item>/gu)).toHaveLength(12)
  })

  it('should keep the item identity stable within a window and change it at the next boundary', () => {
    const firstDocument = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:09:59.000Z'),
      origin: ORIGIN,
    })
    const sameWindowDocument = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:05:01.000Z'),
      origin: ORIGIN,
    })
    const nextDocument = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:10:00.000Z'),
      origin: ORIGIN,
    })

    expect(firstDocument).toBe(sameWindowDocument)
    expect(nextDocument).not.toBe(firstDocument)
    expect(nextDocument).toMatch(/<title>“[^”]+” — [^<]+ · 2026년 8월 14일 10분<\/title>/u)
    expect(nextDocument.match(/<entry>/gu)).toHaveLength(12)
  })

  it('should omit leading and zero-valued time components', () => {
    const document = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T21:00:00.000Z'),
      origin: ORIGIN,
    })

    expect(document).toMatch(/<title>[^<]+ · 2026년 8월 14일 6시<\/title>/u)
    expect(document).not.toContain('2026년 8월 14일 06시 00분')
  })

  it('should show only the date at midnight on the hour', () => {
    const document = createDevFeedDocument({
      format: 'atom',
      now: new Date('2026-08-13T15:00:00.000Z'),
      origin: ORIGIN,
    })

    expect(document).toMatch(/<title>[^<]+ · 2026년 8월 14일<\/title>/u)
  })

  it('should select quotes for feed items published before the Unix epoch', () => {
    const document = createDevFeedDocument({
      format: 'rss',
      now: new Date('1970-01-01T00:00:00.000Z'),
      origin: ORIGIN,
    })

    expect(document.match(/<item>/gu)).toHaveLength(12)
    expect(document).toMatch(/<title>“[^”]+” — [^<]+ · 1970년 1월 1일 9시<\/title>/u)
  })

  it('should escape the request origin in XML output', () => {
    const document = createDevFeedDocument({
      format: 'rss',
      now: new Date('2026-08-13T15:05:00.000Z'),
      origin: `http://localhost:3200?<source>&quote="double"&apostrophe='single'`,
    })

    expect(document).toContain(
      'http://localhost:3200?&lt;source&gt;&amp;quote=&quot;double&quot;&amp;apostrophe=&apos;single&apos;',
    )
  })

  it('should reject an Atom snapshot when no feed item can be created', () => {
    const arrayFrom = vi.spyOn(Array, 'from').mockReturnValueOnce([] as never)

    try {
      expect(() =>
        createDevFeedDocument({
          format: 'atom',
          now: new Date('2026-08-13T15:05:00.000Z'),
          origin: ORIGIN,
        }),
      ).toThrow('개발 피드 항목을 만들지 못했어요.')
    } finally {
      arrayFrom.mockRestore()
    }
  })

  it('should reject a snapshot when the quote catalog is empty', async () => {
    vi.resetModules()
    vi.doMock('../quotes', () => ({DEV_FEED_QUOTES: []}))

    try {
      const {createDevFeedDocument: createDocumentWithoutQuotes} = await import('..')

      expect(() =>
        createDocumentWithoutQuotes({
          format: 'rss',
          now: new Date('2026-08-13T15:05:00.000Z'),
          origin: ORIGIN,
        }),
      ).toThrow('개발 피드 명언을 고르지 못했어요.')
    } finally {
      vi.doUnmock('../quotes')
      vi.resetModules()
    }
  })
})

describe('createDevFeedPlugin', () => {
  it('should register the development feed middleware', () => {
    const {plugin, use} = getMiddleware()

    expect(plugin.name).toBe('pomo-dev-feed')
    expect(use).toHaveBeenCalledOnce()
  })

  it('should serve an RSS document from a forwarded HTTPS request', () => {
    const {middleware} = getMiddleware()
    const {end, response, setHeader} = createResponse()
    const next = vi.fn()

    middleware(
      createRequest('GET', '/__dev/feeds/rss.xml?cache=1', {
        host: 'feed.example:3000',
        'x-forwarded-proto': ['https', 'http'],
      }),
      response,
      next,
    )

    expect(response.statusCode).toBe(200)
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/rss+xml; charset=utf-8')
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    expect(end).toHaveBeenCalledWith(expect.stringContaining('https://feed.example:3000'))
    expect(next).not.toHaveBeenCalled()
  })

  it('should serve an empty HEAD response for an Atom request', () => {
    const {middleware} = getMiddleware()
    const {end, response, setHeader} = createResponse()

    middleware(
      createRequest('HEAD', '/__dev/feeds/atom.xml', {'x-forwarded-proto': 'http'}),
      response,
      vi.fn(),
    )

    expect(response.statusCode).toBe(200)
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/atom+xml; charset=utf-8')
    expect(end).toHaveBeenCalledWith(undefined)
  })

  it('should reject unsupported feed methods', () => {
    const {middleware} = getMiddleware()
    const {end, response, setHeader} = createResponse()

    middleware(createRequest('POST', '/__dev/feeds/rss.xml'), response, vi.fn())

    expect(response.statusCode).toBe(405)
    expect(setHeader).toHaveBeenCalledWith('Allow', 'GET, HEAD')
    expect(end).toHaveBeenCalledWith()
  })

  it('should pass unrelated and missing request URLs to the next middleware', () => {
    const {middleware} = getMiddleware()
    const next = vi.fn()

    middleware(createRequest('GET', '/unrelated'), createResponse().response, next)
    middleware(createRequest('GET', undefined), createResponse().response, next)

    expect(next).toHaveBeenCalledTimes(2)
  })
})
