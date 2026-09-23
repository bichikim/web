import {dayjs} from 'src/utils/zoned-dayjs'
import type {FeedEntry, FeedProvider} from './contract'

const FEED_SLUG = 'today-in-history'
const ENTRY_LIMIT = 50

export interface HistoricalMomentRecord {
  readonly contentHtml: string
  readonly publishedAt: string
  readonly stableKey: string
  readonly summary: string
  readonly title: string
  readonly updatedAt: string
}

export interface HistoricalMomentQuery {
  readonly day: number
  readonly limit: number
  readonly month: number
}

export interface HistoricalMomentSource {
  readonly listPublished: (
    query: HistoricalMomentQuery,
  ) => Promise<ReadonlyArray<HistoricalMomentRecord>>
}

export interface HistoricalMomentsProviderOptions {
  readonly now?: () => Date
  readonly origin: string
  readonly source: HistoricalMomentSource
  readonly timeZone: string
}

const getCalendarDate = (
  date: Date,
  timeZone: string,
): Pick<HistoricalMomentQuery, 'day' | 'month'> => {
  const local = dayjs(date).tz(timeZone)
  return {day: local.date(), month: local.month() + 1}
}

const createEntry = (origin: string, record: HistoricalMomentRecord): FeedEntry => {
  const encodedKey = encodeURIComponent(record.stableKey)

  return {
    contentHtml: record.contentHtml,
    id: `urn:pomo:historical-moment:${encodedKey}`,
    publishedAt: record.publishedAt,
    summary: record.summary,
    title: record.title,
    updatedAt: record.updatedAt,
    url: `${origin}/api/feeds/${FEED_SLUG}#${encodedKey}`,
  }
}

/** Creates the public provider for historical moments matching the viewer's calendar date. */
export const createHistoricalMomentsProvider = (
  options: HistoricalMomentsProviderOptions,
): FeedProvider => {
  const {origin} = new URL(options.origin)
  const now = options.now ?? (() => new Date())

  return {
    // Calendar membership changes without a publish event to invalidate cached documents.
    cachePolicy: 'no-store',
    definition: {
      description: '오늘과 같은 날짜에 있었던 역사적 순간을 출처와 함께 소개합니다.',
      homeUrl: `${origin}/api/feeds`,
      language: 'ko-KR',
      slug: FEED_SLUG,
      title: '오늘 있었던 역사적 순간',
    },
    async listEntries() {
      const calendarDate = getCalendarDate(now(), options.timeZone)
      const records = await options.source.listPublished({...calendarDate, limit: ENTRY_LIMIT})

      return records.map((record) => createEntry(origin, record))
    },
  }
}
