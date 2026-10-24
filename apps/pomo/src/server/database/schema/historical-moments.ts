import {sql} from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {feedChannels} from './feed-channels'

export const historicalEraEnum = pgEnum('historical_era', ['bce', 'ce'])
export const historicalMomentStatusEnum = pgEnum('historical_moment_status', [
  'draft',
  'published',
  'archived',
])

// AI_NOTE - An explicit era avoids ambiguous signed years when sources and feed serializers handle BCE dates.
export const historicalMoments = pgTable(
  'historical_moments',
  {
    channelId: uuid()
      .notNull()
      .references(() => feedChannels.id, {onDelete: 'cascade'}),
    contentHtml: text().notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    eventDay: smallint().notNull(),
    eventMonth: smallint().notNull(),
    eventYear: integer().notNull(),
    generationModel: varchar({length: 128}),
    historicalEra: historicalEraEnum().notNull().default('ce'),
    id: uuid().primaryKey().defaultRandom(),
    publishedAt: timestamp({withTimezone: true}),
    stableKey: varchar({length: 128}).notNull(),
    status: historicalMomentStatusEnum().notNull().default('draft'),
    summary: text().notNull(),
    title: text().notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check('historical_moments_event_year_check', sql`${table.eventYear} > 0`),
    check('historical_moments_event_month_check', sql`${table.eventMonth} between 1 and 12`),
    check('historical_moments_event_day_check', sql`${table.eventDay} between 1 and 31`),
    uniqueIndex('historical_moments_channel_stable_key_index').on(table.channelId, table.stableKey),
    index('historical_moments_feed_date_index').on(
      table.channelId,
      table.eventMonth,
      table.eventDay,
      table.status,
    ),
  ],
)

export const historicalMomentSources = pgTable(
  'historical_moment_sources',
  {
    id: uuid().primaryKey().defaultRandom(),
    momentId: uuid()
      .notNull()
      .references(() => historicalMoments.id, {onDelete: 'cascade'}),
    publisher: text(),
    sortOrder: smallint().notNull().default(0),
    title: text().notNull(),
    url: text().notNull(),
  },
  (table) => [
    check('historical_moment_sources_sort_order_check', sql`${table.sortOrder} >= 0`),
    uniqueIndex('historical_moment_sources_moment_url_index').on(table.momentId, table.url),
  ],
)
