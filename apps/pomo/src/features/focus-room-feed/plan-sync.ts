import type {ParsedFeedItem} from './feed-parser'

const MAXIMUM_FEED_ITEM_AGE_DAYS = 3
const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
const MAXIMUM_ITEMS_PER_SYNC = 20
const MAXIMUM_FEED_ITEM_AGE_MS =
  MAXIMUM_FEED_ITEM_AGE_DAYS *
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND

interface PlanFeedSyncOptions {
  readonly items: ReadonlyArray<ParsedFeedItem>
  readonly storedItemIds: ReadonlyArray<string>
  readonly subscriptionCreatedAt: string
  readonly now: Date
}

export interface FeedSyncPlan {
  readonly ignoredItems: ReadonlyArray<{
    readonly item: ParsedFeedItem
    readonly reason: 'stale' | 'historical'
  }>
  readonly itemsToProcess: ReadonlyArray<ParsedFeedItem>
}

const sortItems = (items: ReadonlyArray<ParsedFeedItem>) =>
  [...items].sort((left, right) => {
    const leftTime = left.publishedAt === null ? 0 : Date.parse(left.publishedAt)
    const rightTime = right.publishedAt === null ? 0 : Date.parse(right.publishedAt)
    return leftTime - rightTime
  })

const isHistoricalItem = (
  subscriptionCreatedAt: string,
  item: ParsedFeedItem,
  isFirstSync: boolean,
) => {
  if (item.publishedAt === null) {
    return isFirstSync
  }

  return Date.parse(item.publishedAt) < Date.parse(subscriptionCreatedAt)
}
const isStaleItem = (item: ParsedFeedItem, oldestAcceptedTimestamp: number) =>
  item.publishedAt !== null && Date.parse(item.publishedAt) < oldestAcceptedTimestamp

/** Selects unseen feed items to process or ignore within the existing sync limits. */
export const planFeedSync = (options: PlanFeedSyncOptions): FeedSyncPlan => {
  const storedIds = new Set(options.storedItemIds)
  const matchedLegacyIds = new Set<string>()
  const isFirstSync = options.storedItemIds.length === 0
  const firstUndatedFeedItem = isFirstSync
    ? options.items.find((item) => item.publishedAt === null)
    : undefined
  const unseenItems = sortItems(
    options.items.filter((item) => {
      const isStoredItem = storedIds.has(item.id)
      const isStoredLegacyItem =
        item.legacyId !== undefined &&
        storedIds.has(item.legacyId) &&
        !matchedLegacyIds.has(item.legacyId)

      if (isStoredItem || isStoredLegacyItem) {
        if (item.legacyId !== undefined) {
          matchedLegacyIds.add(item.legacyId)
        }
        return false
      }

      return true
    }),
  ).slice(-MAXIMUM_ITEMS_PER_SYNC)

  if (unseenItems.length === 0) {
    return {ignoredItems: [], itemsToProcess: []}
  }

  const oldestAcceptedTimestamp = options.now.getTime() - MAXIMUM_FEED_ITEM_AGE_MS
  const staleItems = unseenItems.filter((item) => isStaleItem(item, oldestAcceptedTimestamp))
  const staleIds = new Set(staleItems.map((item) => item.id))
  const eligibleItems = unseenItems.filter((item) => !staleIds.has(item.id))
  const historicalItems = eligibleItems.filter((item) =>
    isHistoricalItem(options.subscriptionCreatedAt, item, isFirstSync),
  )
  const historicalIds = new Set(historicalItems.map((item) => item.id))
  const currentItems = eligibleItems.filter((item) => !historicalIds.has(item.id))
  const itemsToProcess =
    isFirstSync && currentItems.length === 0 && firstUndatedFeedItem !== undefined
      ? [firstUndatedFeedItem]
      : currentItems
  const processedIds = new Set(itemsToProcess.map((item) => item.id))
  const ignoredItems = unseenItems
    .filter((item) => !processedIds.has(item.id))
    .map((item) => ({
      item,
      reason: staleIds.has(item.id) ? ('stale' as const) : ('historical' as const),
    }))

  return {ignoredItems, itemsToProcess}
}
