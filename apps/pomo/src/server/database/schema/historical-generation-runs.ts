import {sql} from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {feedChannels} from './feed-channels'

export const historicalGenerationStatusEnum = pgEnum('historical_generation_status', [
  'preparing',
  'submitted',
  'completed',
  'failed',
  'rejected',
])

export const historicalGenerationRuns = pgTable(
  'historical_generation_runs',
  {
    attemptCount: integer().notNull().default(1),
    channelId: uuid()
      .notNull()
      .references(() => feedChannels.id, {onDelete: 'cascade'}),
    completedAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    errorMessage: text(),
    id: uuid().primaryKey().defaultRandom(),
    openAiResponseId: varchar({length: 128}),
    openAiSubmissionKey: uuid().notNull().defaultRandom(),
    promptVersion: varchar({length: 64}).notNull(),
    sourcePolicyVersion: varchar({length: 64}).notNull(),
    sourceUrls: jsonb()
      .$type<ReadonlyArray<string>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: historicalGenerationStatusEnum().notNull().default('preparing'),
    targetDate: date({mode: 'string'}).notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check(
      'historical_generation_runs_attempt_count_check',
      sql`${table.attemptCount} between 1 and 2`,
    ),
    uniqueIndex('historical_generation_runs_channel_target_date_index').on(
      table.channelId,
      table.targetDate,
    ),
    uniqueIndex('historical_generation_runs_openai_response_id_index').on(table.openAiResponseId),
    index('historical_generation_runs_recovery_index').on(table.status, table.updatedAt),
  ],
)

export const processedOpenAiWebhookEvents = pgTable('processed_openai_webhook_events', {
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  eventId: varchar({length: 128}).primaryKey(),
})
