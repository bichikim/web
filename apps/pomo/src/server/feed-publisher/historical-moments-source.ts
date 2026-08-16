import {and, desc, eq, isNotNull} from 'drizzle-orm'
import {z} from 'zod'

import type {
  HistoricalMomentQuery,
  HistoricalMomentRecord,
  HistoricalMomentSource,
} from 'src/features/feed-publisher/historical-moments-provider'
import {feedChannels, getDatabase, historicalMoments} from '../database'

const historicalMomentRowSchema = z.object({
  contentHtml: z.string().min(1),
  publishedAt: z.date(),
  stableKey: z.string().min(1),
  summary: z.string().min(1),
  title: z.string().min(1),
  updatedAt: z.date(),
})

const listPublished = async (
  query: HistoricalMomentQuery,
): Promise<ReadonlyArray<HistoricalMomentRecord>> => {
  const rows = await getDatabase()
    .select({
      contentHtml: historicalMoments.contentHtml,
      publishedAt: historicalMoments.publishedAt,
      stableKey: historicalMoments.stableKey,
      summary: historicalMoments.summary,
      title: historicalMoments.title,
      updatedAt: historicalMoments.updatedAt,
    })
    .from(historicalMoments)
    .innerJoin(feedChannels, eq(historicalMoments.channelId, feedChannels.id))
    .where(
      and(
        eq(feedChannels.slug, 'today-in-history'),
        eq(feedChannels.enabled, true),
        eq(historicalMoments.eventMonth, query.month),
        eq(historicalMoments.eventDay, query.day),
        eq(historicalMoments.status, 'published'),
        isNotNull(historicalMoments.publishedAt),
      ),
    )
    .orderBy(desc(historicalMoments.publishedAt))
    .limit(query.limit)

  return rows.map((row) => {
    const parsed = historicalMomentRowSchema.parse(row)

    return {
      ...parsed,
      publishedAt: parsed.publishedAt.toISOString(),
      updatedAt: parsed.updatedAt.toISOString(),
    }
  })
}

export const historicalMomentsSource: HistoricalMomentSource = {listPublished}
