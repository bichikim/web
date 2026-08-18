import {z} from 'zod'

import type {FeedEntry} from './contract'

const EMPTY_FEED_UPDATED_AT = '1970-01-01T00:00:00.000Z'
const MAX_ENTRY_COUNT = 50

const absoluteHttpUrlSchema = z.url().refine((value) => {
  const {protocol} = new URL(value)
  return protocol === 'http:' || protocol === 'https:'
}, 'URL must use the http or https protocol')

const feedEntrySchema = z.object({
  contentHtml: z.string().optional(),
  id: z.string().trim().min(1),
  publishedAt: z.iso.datetime(),
  summary: z.string().trim().min(1),
  title: z.string().trim().min(1),
  updatedAt: z.iso.datetime().optional(),
  url: absoluteHttpUrlSchema,
})

export interface NormalizedFeed {
  readonly entries: ReadonlyArray<FeedEntry>
  readonly updatedAt: string
}

/** Validates provider output and derives stable feed-level metadata. */
export const normalizeFeed = (value: unknown): NormalizedFeed => {
  const entries = z.array(feedEntrySchema).max(MAX_ENTRY_COUNT).parse(value)
  const ids = new Set<string>()

  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new TypeError(`Duplicate feed entry id: ${entry.id}`)
    }

    ids.add(entry.id)
  }

  const latestTimestamp = entries.reduce(
    (latest, entry) => Math.max(latest, Date.parse(entry.updatedAt ?? entry.publishedAt)),
    Date.parse(EMPTY_FEED_UPDATED_AT),
  )

  return {
    entries,
    updatedAt: new Date(latestTimestamp).toISOString(),
  }
}
