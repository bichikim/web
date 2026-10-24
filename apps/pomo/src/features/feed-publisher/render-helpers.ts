import type {FeedEntry} from './contract'

const getEntryPublishedAt = (entry: FeedEntry): number => Date.parse(entry.publishedAt)

export const sortFeedEntries = (entries: ReadonlyArray<FeedEntry>): ReadonlyArray<FeedEntry> =>
  entries.toSorted((left, right) => getEntryPublishedAt(right) - getEntryPublishedAt(left))

export const toAtomDate = (value: string): string => new Date(value).toISOString()

export const toRssDate = (value: string): string => new Date(value).toUTCString()
