import type {FeedEntry, FeedProvider} from './contract'

const KOREA_TIME_ZONE = 'Asia/Seoul'
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
}

const getKoreaCalendarDate = (date: Date): Pick<HistoricalMomentQuery, 'day' | 'month'> => {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'numeric',
    timeZone: KOREA_TIME_ZONE,
  }).formatToParts(date)
  const values = new Map(parts.map((part) => [part.type, part.value]))
  const day = Number(values.get('day'))
  const month = Number(values.get('month'))

  return {day, month}
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
    url: `${origin}/feeds/${FEED_SLUG}#${encodedKey}`,
  }
}

/** Creates the public provider for historical moments matching today's Korean calendar date. */
export const createHistoricalMomentsProvider = (
  options: HistoricalMomentsProviderOptions,
): FeedProvider => {
  const {origin} = new URL(options.origin)
  const now = options.now ?? (() => new Date())

  return {
    definition: {
      description: '오늘과 같은 날짜에 있었던 역사적 순간을 출처와 함께 소개합니다.',
      homeUrl: `${origin}/feeds`,
      language: 'ko-KR',
      slug: FEED_SLUG,
      title: '오늘 있었던 역사적 순간',
    },
    async listEntries() {
      const calendarDate = getKoreaCalendarDate(now())
      const records = await options.source.listPublished({...calendarDate, limit: ENTRY_LIMIT})

      return records.map((record) => createEntry(origin, record))
    },
  }
}
