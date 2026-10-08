import {sql} from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import type {
  ApiAiAttemptState,
  ApiAiKind,
  ApiAiResponse,
  ApiAiStatus,
  ApiAiWebhookEvent,
} from 'src/server/api-ai/types'
import {pomoUsers} from './users'

export const apiAiJobs = pgTable(
  'api_ai_jobs',
  {
    activeAttemptId: uuid(),
    body: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
    cancelRequestedAt: timestamp({withTimezone: true}),
    completedAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    deliveredAt: timestamp({withTimezone: true}),
    errorMessage: text(),
    executionExpiresAt: timestamp({withTimezone: true}),
    generationMilliseconds: integer().notNull(),
    id: uuid().primaryKey(),
    kind: varchar({length: 32}).$type<ApiAiKind>().notNull(),
    nextAttemptAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    ownerId: uuid().references(() => pomoUsers.id, {onDelete: 'set null'}),
    queueExpiresAt: timestamp({withTimezone: true}).notNull(),
    requestHash: varchar({length: 64}).notNull(),
    result: jsonb().$type<ApiAiResponse>(),
    status: varchar({length: 32}).$type<ApiAiStatus>().notNull().default('queued'),
  },
  (table) => [
    index('api_ai_jobs_dispatch_index').on(table.status, table.nextAttemptAt, table.createdAt),
    index('api_ai_jobs_delivery_index').on(table.status, table.deliveredAt, table.nextAttemptAt),
    check('api_ai_jobs_kind_check', sql`${table.kind} in ('cloud-text', 'history')`),
    check(
      'api_ai_jobs_status_check',
      sql`${table.status} in (
        'queued', 'submitting', 'running', 'recovery_pending', 'succeeded', 'failed', 'cancelled')`,
    ),
    check('api_ai_jobs_generation_check', sql`${table.generationMilliseconds} > 0`),
  ],
)

export const apiAiAttempts = pgTable(
  'api_ai_attempts',
  {
    billedTokens: integer(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    deadlineAt: timestamp({withTimezone: true}).notNull(),
    errorMessage: text(),
    id: uuid().primaryKey(),
    jobId: uuid()
      .notNull()
      .references(() => apiAiJobs.id, {onDelete: 'cascade'}),
    modelId: text().notNull(),
    poolId: text().notNull(),
    providerId: varchar({length: 64}).notNull(),
    responseId: text(),
    retryAt: timestamp({withTimezone: true}),
    state: varchar({length: 32}).$type<ApiAiAttemptState>().notNull(),
    tokenReservation: integer().notNull(),
  },
  (table) => [
    index('api_ai_attempts_pool_index').on(table.poolId, table.state, table.createdAt),
    index('api_ai_attempts_job_index').on(table.jobId),
    uniqueIndex('api_ai_attempts_response_index').on(table.providerId, table.responseId),
    check(
      'api_ai_attempts_state_check',
      sql`${table.state} in ('submitting', 'running', 'unknown', 'succeeded', 'rejected', 'failed', 'cancelled')`,
    ),
    check('api_ai_attempts_tokens_check', sql`${table.tokenReservation} >= 0`),
  ],
)

export const apiAiPools = pgTable('api_ai_pools', {
  blockedUntil: timestamp({withTimezone: true}),
  disabled: text(),
  id: text().primaryKey(),
})

export const apiAiCallbacks = pgTable(
  'api_ai_callbacks',
  {
    eventId: text().notNull(),
    eventType: varchar({length: 32}).$type<ApiAiWebhookEvent['type']>().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    nextAttemptAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    processedAt: timestamp({withTimezone: true}),
    providerId: varchar({length: 64}).notNull(),
    receivedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    responseId: text().notNull(),
  },
  (table) => [
    uniqueIndex('api_ai_callbacks_provider_event_index').on(table.providerId, table.eventId),
    index('api_ai_callbacks_pending_index').on(
      table.processedAt,
      table.nextAttemptAt,
      table.receivedAt,
    ),
  ],
)
