// oxlint-disable no-await-in-loop -- A response stream must be read and size-checked in order.
import type {FeedGenerationSettings} from './generation-settings'
import type {FeedConnection} from './schema'
import {
  type FeedDialogueJob,
  type FeedItemRecord,
  getFeedItemRecordId,
  MAXIMUM_FEED_SCRIPT_LENGTH,
} from './feed-dialogue-schema'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import {
  cleanFeedText,
  createFeedScript,
  extractArticleText,
  type ParsedFeedItem,
  parseFeedXml,
} from './feed-parser'

const MAXIMUM_FEED_ITEM_AGE_DAYS = 3
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
const MAXIMUM_FEED_BYTES = 2_000_000
const MAXIMUM_ARTICLE_BYTES = 5_000_000
const MAXIMUM_ITEMS_PER_SYNC = 20
const MAXIMUM_FEED_ITEM_AGE_MS =
  MAXIMUM_FEED_ITEM_AGE_DAYS *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND

export interface FeedFetcher {
  (url: string): Promise<Response>
}

export interface SynchronizeFeedsOptions {
  readonly connections: ReadonlyArray<FeedConnection>
  readonly createId: () => string
  readonly fetcher: FeedFetcher
  readonly now: Date
  readonly repository: FeedDialogueRepository
  readonly resolveGenerationSettings: (
    connectionId: string,
  ) => Promise<FeedGenerationSettings | null>
}

export interface FeedSyncFailure {
  readonly connectionId: string
  readonly message: string
}

export interface FeedSyncSummary {
  readonly failures: ReadonlyArray<FeedSyncFailure>
  readonly queuedJobIds: ReadonlyArray<string>
  readonly successfulConnections: number
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message.length > 0 ? error.message : '피드를 가져오지 못했어요.'
const readResponseText = async (response: Response, maximumBytes: number) => {
  const contentLength = Number(response.headers.get('content-length'))

  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new Error('응답 크기가 안전한 처리 한도를 넘었어요.')
  }

  if (response.body === null) {
    const text = await response.text()

    if (new TextEncoder().encode(text).byteLength > maximumBytes) {
      throw new Error('응답 크기가 안전한 처리 한도를 넘었어요.')
    }

    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ''

  while (true) {
    const result = await reader.read()

    if (result.done) {
      return text + decoder.decode()
    }

    totalBytes += result.value.byteLength

    if (totalBytes > maximumBytes) {
      await reader.cancel()
      throw new Error('응답 크기가 안전한 처리 한도를 넘었어요.')
    }

    text += decoder.decode(result.value, {stream: true})
  }
}
const fetchText = async (fetcher: FeedFetcher, url: string, maximumBytes: number) => {
  const response = await fetcher(url)

  if (!response.ok) {
    throw new Error(`피드 서버가 ${response.status} 응답을 보냈어요.`)
  }

  return readResponseText(response, maximumBytes)
}
interface ResolveContentOptions {
  readonly feedUrl: string
  readonly fetcher: FeedFetcher
  readonly item: ParsedFeedItem
}

const getDocumentUrl = (value: string) => {
  const url = new URL(value)
  url.hash = ''
  return url.href
}
const resolveContent = async (options: ResolveContentOptions) => {
  const feedContent = cleanFeedText(options.item.content)

  if (options.item.contentKind === 'full' && feedContent.length > 0) {
    return options.item.content
  }

  if (options.item.link.length === 0) {
    throw new Error('피드가 전체 원문이나 원문 주소를 제공하지 않았어요.')
  }

  if (getDocumentUrl(options.item.link) === getDocumentUrl(options.feedUrl)) {
    throw new Error('피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.')
  }

  const articleHtml = await fetchText(options.fetcher, options.item.link, MAXIMUM_ARTICLE_BYTES)
  const articleText = extractArticleText(articleHtml)

  if (articleText.length === 0) {
    throw new Error('연결된 페이지에서 전체 원문을 찾지 못했어요.')
  }

  return articleText
}
const sortItems = (items: ReadonlyArray<ParsedFeedItem>) =>
  [...items].sort((left, right) => {
    const leftTime = left.publishedAt === null ? 0 : Date.parse(left.publishedAt)
    const rightTime = right.publishedAt === null ? 0 : Date.parse(right.publishedAt)
    return leftTime - rightTime
  })

interface ProcessFeedItemOptions {
  readonly connection: FeedConnection
  readonly createId: () => string
  readonly feedTitle: string
  readonly fetcher: FeedFetcher
  readonly item: ParsedFeedItem
  readonly nowIso: string
  readonly repository: FeedDialogueRepository
  readonly resolveGenerationSettings: SynchronizeFeedsOptions['resolveGenerationSettings']
}

const processFeedItem = async (options: ProcessFeedItemOptions): Promise<string | null> => {
  const publishedAt = options.item.publishedAt ?? options.nowIso
  const itemTitle = cleanFeedText(options.item.title) || '제목 없는 피드'
  const recordBase = {
    discoveredAt: options.nowIso,
    feedConnectionId: options.connection.id,
    feedItemId: options.item.id,
    id: getFeedItemRecordId(options.connection.id, options.item.id),
    itemTitle,
    publishedAt,
    sourceTitle: cleanFeedText(options.feedTitle) || new URL(options.connection.url).hostname,
    sourceUrl: options.item.link || options.connection.url,
    updatedAt: options.nowIso,
    version: 1 as const,
  }
  let content: string

  try {
    content = await resolveContent({
      feedUrl: options.connection.url,
      fetcher: options.fetcher,
      item: options.item,
    })
  } catch (error: unknown) {
    const item = {
      ...recordBase,
      contentLength: 0,
      message: getErrorMessage(error),
      status: 'failed' as const,
    } satisfies FeedItemRecord
    await options.repository.saveItems([item])
    return null
  }

  const script = createFeedScript(itemTitle, content)

  if (script.length > MAXIMUM_FEED_SCRIPT_LENGTH) {
    const item = {
      ...recordBase,
      contentLength: script.length,
      message: `원문이 ${script.length.toLocaleString('ko-KR')}자로 3,000자 제한을 넘었어요.`,
      status: 'too-long' as const,
    } satisfies FeedItemRecord
    await options.repository.saveItems([item])
    return null
  }

  if (script.length === 0) {
    const item = {
      ...recordBase,
      contentLength: 0,
      message: '읽을 수 있는 원문이 없어요.',
      status: 'failed' as const,
    } satisfies FeedItemRecord
    await options.repository.saveItems([item])
    return null
  }

  const generationSettings = await options.resolveGenerationSettings(options.connection.id)

  if (generationSettings === null) {
    return null
  }

  const jobId = options.createId()
  const item = {
    ...recordBase,
    contentLength: script.length,
    message: null,
    status: 'queued' as const,
  } satisfies FeedItemRecord
  const job = {
    createdAt: options.nowIso,
    errorMessage: null,
    feedConnectionId: options.connection.id,
    feedItemId: options.item.id,
    id: jobId,
    itemTitle,
    modelId: generationSettings.modelId,
    publishedAt,
    script,
    sourceTitle: recordBase.sourceTitle,
    sourceUrl: recordBase.sourceUrl,
    status: 'queued',
    updatedAt: options.nowIso,
    version: 1,
    voiceId: generationSettings.voiceId,
  } satisfies FeedDialogueJob
  await options.repository.queue(job, item)
  return jobId
}

interface CreateIgnoredItemOptions {
  readonly connection: FeedConnection
  readonly feedTitle: string
  readonly item: ParsedFeedItem
  readonly message: string
  readonly nowIso: string
}

const createIgnoredItem = (options: CreateIgnoredItemOptions): FeedItemRecord => ({
  contentLength: 0,
  discoveredAt: options.nowIso,
  feedConnectionId: options.connection.id,
  feedItemId: options.item.id,
  id: getFeedItemRecordId(options.connection.id, options.item.id),
  itemTitle: cleanFeedText(options.item.title) || '제목 없는 피드',
  message: options.message,
  publishedAt: options.item.publishedAt ?? options.nowIso,
  sourceTitle: cleanFeedText(options.feedTitle) || new URL(options.connection.url).hostname,
  sourceUrl: options.item.link || options.connection.url,
  status: 'ignored',
  updatedAt: options.nowIso,
  version: 1,
})

const getSubscriptionTimestamp = (connection: FeedConnection) => Date.parse(connection.createdAt)
const isHistoricalItem = (connection: FeedConnection, item: ParsedFeedItem) => {
  if (item.publishedAt === null) {
    return false
  }

  return Date.parse(item.publishedAt) < getSubscriptionTimestamp(connection)
}
const isStaleItem = (item: ParsedFeedItem, oldestAcceptedTimestamp: number) =>
  item.publishedAt !== null && Date.parse(item.publishedAt) < oldestAcceptedTimestamp

const synchronizeConnection = async (
  options: SynchronizeFeedsOptions,
  connection: FeedConnection,
): Promise<ReadonlyArray<string>> => {
  const xml = await fetchText(options.fetcher, connection.url, MAXIMUM_FEED_BYTES)
  const feed = parseFeedXml(xml, connection.url)
  const storedItems = await options.repository.listItems(connection.id)
  const storedIds = new Set(storedItems.map((item) => item.feedItemId))
  const unseenItems = sortItems(feed.items.filter((item) => !storedIds.has(item.id))).slice(
    -MAXIMUM_ITEMS_PER_SYNC,
  )

  if (unseenItems.length === 0) {
    return []
  }

  const nowIso = options.now.toISOString()
  const oldestAcceptedTimestamp = options.now.getTime() - MAXIMUM_FEED_ITEM_AGE_MS
  const staleItems = unseenItems.filter((item) => isStaleItem(item, oldestAcceptedTimestamp))
  const staleIds = new Set(staleItems.map((item) => item.id))
  const eligibleItems = unseenItems.filter((item) => !staleIds.has(item.id))
  const historicalItems = eligibleItems.filter((item) => isHistoricalItem(connection, item))
  const historicalIds = new Set(historicalItems.map((item) => item.id))
  const currentItems = eligibleItems.filter((item) => !historicalIds.has(item.id))
  const itemsToProcess =
    storedItems.length === 0 && currentItems.length === 0 ? eligibleItems.slice(-1) : currentItems
  const processedIds = new Set(itemsToProcess.map((item) => item.id))
  const ignoredItems = unseenItems.filter((item) => !processedIds.has(item.id))

  if (ignoredItems.length > 0) {
    await options.repository.saveItems(
      ignoredItems.map((item) =>
        createIgnoredItem({
          connection,
          feedTitle: feed.title,
          item,
          message: staleIds.has(item.id)
            ? '발행 후 3일이 지난 이전 항목이에요.'
            : '구독을 시작하기 전의 이전 항목이에요.',
          nowIso,
        }),
      ),
    )
  }

  const queuedIds = await Promise.all(
    itemsToProcess.map((item) =>
      processFeedItem({
        connection,
        createId: options.createId,
        feedTitle: feed.title,
        fetcher: options.fetcher,
        item,
        nowIso,
        repository: options.repository,
        resolveGenerationSettings: options.resolveGenerationSettings,
      }),
    ),
  )
  return queuedIds.filter((jobId): jobId is string => jobId !== null)
}

/** Fetches every subscription once and persists only previously unseen feed items. */
export const synchronizeFeeds = async (
  options: SynchronizeFeedsOptions,
): Promise<FeedSyncSummary> => {
  const results = await Promise.all(
    options.connections.map(async (connection) => {
      try {
        return {
          connection,
          jobIds: await synchronizeConnection(options, connection),
          ok: true as const,
        }
      } catch (error: unknown) {
        return {connection, error, ok: false as const}
      }
    }),
  )
  const queuedJobIds = results.flatMap((result) => (result.ok ? result.jobIds : []))
  const failures = results.flatMap((result) =>
    result.ok ? [] : [{connectionId: result.connection.id, message: getErrorMessage(result.error)}],
  )

  return {
    failures,
    queuedJobIds,
    successfulConnections: results.length - failures.length,
  }
}
