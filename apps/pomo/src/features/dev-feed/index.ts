import type {IncomingMessage, ServerResponse} from 'node:http'

import {DEV_FEED_QUOTES} from './quotes'

const FEED_INTERVAL_MINUTES = 5
const FEED_HISTORY_SIZE = 12
const MILLISECONDS_PER_MINUTE = 60_000
const FEED_INTERVAL_MILLISECONDS = FEED_INTERVAL_MINUTES * MILLISECONDS_PER_MINUTE
const RSS_PATH = '/__dev/feeds/rss.xml'
const ATOM_PATH = '/__dev/feeds/atom.xml'
const FEED_TITLE = 'Pomo 개발 테스트 피드'
const KOREA_TIME_ZONE = 'Asia/Seoul'

interface DevFeedItem {
  readonly id: string
  readonly message: string
  readonly publishedAt: Date
}

interface DevFeedDocumentOptions {
  readonly format: 'atom' | 'rss'
  readonly now: Date
  readonly origin: string
}

interface MiddlewareCollection {
  readonly use: (middleware: DevFeedMiddleware) => void
}

interface DevServer {
  readonly middlewares: MiddlewareCollection
}

type DevFeedMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) => void

const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const getKoreaTimeLabel = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: 'numeric',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: 'numeric',
    timeZone: KOREA_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const month = Number(values.get('month'))
  const day = Number(values.get('day'))
  const hour = Number(values.get('hour'))
  const minute = Number(values.get('minute'))
  const timeParts = [hour === 0 ? null : `${hour}시`, minute === 0 ? null : `${minute}분`]
    .filter((part) => part !== null)
    .join(' ')
  const dateLabel = `${values.get('year')}년 ${month}월 ${day}일`
  return timeParts.length === 0 ? dateLabel : `${dateLabel} ${timeParts}`
}

const getFeedMessage = (publishedAt: Date) => {
  const sequence = Math.floor(publishedAt.getTime() / FEED_INTERVAL_MILLISECONDS)
  const quote = DEV_FEED_QUOTES.at(sequence % DEV_FEED_QUOTES.length)

  if (quote === undefined) {
    throw new Error('개발 피드 명언을 고르지 못했어요.')
  }

  return `“${quote.text}” — ${quote.source} · ${getKoreaTimeLabel(publishedAt)}`
}

const createFeedItems = (now: Date): ReadonlyArray<DevFeedItem> => {
  const latestTimestamp =
    Math.floor(now.getTime() / FEED_INTERVAL_MILLISECONDS) * FEED_INTERVAL_MILLISECONDS

  return Array.from({length: FEED_HISTORY_SIZE}, (_, index) => {
    const publishedAt = new Date(latestTimestamp - index * FEED_INTERVAL_MILLISECONDS)
    const id = publishedAt.toISOString()
    return {id, message: getFeedMessage(publishedAt), publishedAt}
  })
}

const createRssDocument = (origin: string, items: ReadonlyArray<DevFeedItem>) => {
  const feedUrl = `${origin}${RSS_PATH}`
  const itemXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.message)}</title>
      <description>${escapeXml(item.message)}</description>
      <content:encoded>${escapeXml(item.message)}</content:encoded>
      <link>${escapeXml(`${feedUrl}#${item.id}`)}</link>
      <guid isPermaLink="false">${escapeXml(`pomo-dev-feed:${item.id}`)}</guid>
      <pubDate>${item.publishedAt.toUTCString()}</pubDate>
    </item>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${escapeXml(origin)}</link>
    <description>5분마다 현재 시각으로 새 항목을 만드는 Pomo 개발 테스트 피드</description>
    <language>ko-KR</language>
    <ttl>${FEED_INTERVAL_MINUTES}</ttl>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${itemXml}
  </channel>
</rss>
`
}

const createAtomDocument = (origin: string, items: ReadonlyArray<DevFeedItem>) => {
  const feedUrl = `${origin}${ATOM_PATH}`
  const [latestItem] = items

  if (latestItem === undefined) {
    throw new Error('개발 피드 항목을 만들지 못했어요.')
  }

  const entryXml = items
    .map(
      (item) => `  <entry>
    <title>${escapeXml(item.message)}</title>
    <id>${escapeXml(`urn:pomo:dev-feed:${item.id}`)}</id>
    <link href="${escapeXml(`${feedUrl}#${item.id}`)}" />
    <updated>${item.publishedAt.toISOString()}</updated>
    <published>${item.publishedAt.toISOString()}</published>
    <content type="text">${escapeXml(item.message)}</content>
  </entry>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${FEED_TITLE}</title>
  <id>${escapeXml(feedUrl)}</id>
  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml" />
  <link href="${escapeXml(origin)}" />
  <updated>${latestItem.publishedAt.toISOString()}</updated>
${entryXml}
</feed>
`
}

/** Creates a deterministic RSS or Atom snapshot whose newest item changes every five minutes. */
export const createDevFeedDocument = (options: DevFeedDocumentOptions) => {
  const items = createFeedItems(options.now)
  return options.format === 'rss'
    ? createRssDocument(options.origin, items)
    : createAtomDocument(options.origin, items)
}

const getHeaderValue = (value: string | ReadonlyArray<string> | undefined) =>
  Array.isArray(value) ? value[0] : value

const getRequestOrigin = (request: IncomingMessage) => {
  const forwardedProtocol = getHeaderValue(request.headers['x-forwarded-proto'])
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http'
  const host = request.headers.host ?? 'localhost'
  return `${protocol}://${host}`
}

const writeFeedResponse = (
  request: IncomingMessage,
  response: ServerResponse,
  format: DevFeedDocumentOptions['format'],
) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.statusCode = 405
    response.setHeader('Allow', 'GET, HEAD')
    response.end()
    return
  }

  const document = createDevFeedDocument({
    format,
    now: new Date(),
    origin: getRequestOrigin(request),
  })
  response.statusCode = 200
  response.setHeader(
    'Content-Type',
    format === 'rss' ? 'application/rss+xml; charset=utf-8' : 'application/atom+xml; charset=utf-8',
  )
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.end(request.method === 'HEAD' ? undefined : document)
}

/** Adds RSS and Atom fixtures only to the Vite development server. */
export const createDevFeedPlugin = () => ({
  configureServer(server: DevServer) {
    server.middlewares.use((request, response, next) => {
      const pathname = request.url?.split('?', 1)[0]

      if (pathname === RSS_PATH) {
        writeFeedResponse(request, response, 'rss')
        return
      }

      if (pathname === ATOM_PATH) {
        writeFeedResponse(request, response, 'atom')
        return
      }

      next()
    })
  },
  name: 'pomo-dev-feed',
})
