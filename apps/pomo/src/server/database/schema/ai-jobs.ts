import {sql} from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import {pomoUsers} from './users'

export const aiJobCapabilityEnum = pgEnum('ai_job_capability', [
  'text',
  'speech_to_text',
  'text_to_speech',
  'image',
  'sound',
])

export const aiJobStatusEnum = pgEnum('ai_job_status', [
  'queued',
  'running',
  'recovery_pending',
  'succeeded',
  'failed',
  'cancelled',
  'timed_out',
])

export const aiJobSubmissionStateEnum = pgEnum('ai_job_submission_state', [
  'not_submitted',
  'accepted',
  'unknown',
  'manual_review',
])

export const aiArtifactLifecycleEnum = pgEnum('ai_artifact_lifecycle', [
  'temporary',
  'archiving',
  'archive_cleanup_pending',
  'saved',
  'deletion_pending',
  'deleted',
])

export const aiArtifactRetentionClassEnum = pgEnum('ai_artifact_retention_class', [
  'temporary',
  'unsaved_result',
  'saved_result',
])

export const aiCostLedgerStatusEnum = pgEnum('ai_cost_ledger_status', [
  'pending',
  'succeeded',
  'failed',
  'cancelled',
  'unknown',
])

export const aiConcurrencyScopeEnum = pgEnum('ai_concurrency_scope', ['user', 'media', 'runner'])

export type AiJobPayload = Readonly<Record<string, unknown>>

export const aiJobs = pgTable(
  'ai_jobs',
  {
    attemptCount: integer().notNull().default(0),
    capability: aiJobCapabilityEnum().notNull(),
    completedAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    dispatchLeaseUntil: timestamp({withTimezone: true}),
    errorCode: varchar({length: 64}),
    errorMessage: text(),
    estimatedCredits: integer(),
    id: uuid().primaryKey().defaultRandom(),
    idempotencyKey: varchar({length: 128}).notNull(),
    intermediateCleanupAt: timestamp({withTimezone: true}),
    lastRunnerError: text(),
    lastSubmissionError: text(),
    modelId: varchar({length: 128}).notNull(),
    progress: integer().notNull().default(0),
    providerAcceptedAt: timestamp({withTimezone: true}),
    quotaUnits: integer().notNull().default(1),
    recoveryAttempts: integer().notNull().default(0),
    recoveryDeadlineAt: timestamp({withTimezone: true}),
    request: jsonb().$type<AiJobPayload>().notNull(),
    requestHash: varchar({length: 64}).notNull(),
    result: jsonb().$type<AiJobPayload>(),
    runnerJobId: varchar({length: 255}),
    settledCredits: integer(),
    startedAt: timestamp({withTimezone: true}),
    status: aiJobStatusEnum().notNull().default('queued'),
    submissionState: aiJobSubmissionStateEnum().notNull().default('not_submitted'),
    timeoutAt: timestamp({withTimezone: true}).notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    usagePeriodEnd: date({mode: 'string'}),
    usagePeriodStart: date({mode: 'string'}).notNull(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    check('ai_jobs_attempt_count_check', sql`${table.attemptCount} >= 0`),
    check('ai_jobs_progress_check', sql`${table.progress} between 0 and 100`),
    check('ai_jobs_quota_units_check', sql`${table.quotaUnits} > 0`),
    check('ai_jobs_recovery_attempts_check', sql`${table.recoveryAttempts} >= 0`),
    check(
      'ai_jobs_estimated_credits_check',
      sql`${table.estimatedCredits} is null or ${table.estimatedCredits} >= 0`,
    ),
    check(
      'ai_jobs_settled_credits_check',
      sql`${table.settledCredits} is null or ${table.settledCredits} >= 0`,
    ),
    uniqueIndex('ai_jobs_user_idempotency_index').on(table.userId, table.idempotencyKey),
    index('ai_jobs_user_created_at_index').on(table.userId, table.createdAt),
    index('ai_jobs_recovery_index').on(table.status, table.dispatchLeaseUntil, table.timeoutAt),
  ],
)

export const aiUsageBuckets = pgTable(
  'ai_usage_buckets',
  {
    consumedCredits: integer().notNull().default(0),
    consumedUnits: integer().notNull().default(0),
    periodStart: date({mode: 'string'}).notNull(),
    reservedCredits: integer().notNull().default(0),
    reservedUnits: integer().notNull().default(0),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    primaryKey({columns: [table.userId, table.periodStart]}),
    check('ai_usage_buckets_consumed_units_check', sql`${table.consumedUnits} >= 0`),
    check('ai_usage_buckets_reserved_units_check', sql`${table.reservedUnits} >= 0`),
    check('ai_usage_buckets_consumed_credits_check', sql`${table.consumedCredits} >= 0`),
    check('ai_usage_buckets_reserved_credits_check', sql`${table.reservedCredits} >= 0`),
  ],
)

export const aiConcurrencyBuckets = pgTable(
  'ai_concurrency_buckets',
  {
    limitUnits: integer().notNull(),
    runningUnits: integer().notNull().default(0),
    scope: aiConcurrencyScopeEnum().notNull(),
    scopeKey: text().primaryKey(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid().references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    check('ai_concurrency_buckets_limit_check', sql`${table.limitUnits} > 0`),
    check(
      'ai_concurrency_buckets_running_check',
      sql`${table.runningUnits} between 0 and ${table.limitUnits}`,
    ),
    index('ai_concurrency_buckets_user_scope_index').on(table.userId, table.scope),
  ],
)

export const aiConcurrencyReservations = pgTable(
  'ai_concurrency_reservations',
  {
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    jobId: uuid()
      .notNull()
      .references(() => aiJobs.id, {onDelete: 'cascade'}),
    scope: aiConcurrencyScopeEnum().notNull(),
    scopeKey: text()
      .notNull()
      .references(() => aiConcurrencyBuckets.scopeKey, {onDelete: 'cascade'}),
    units: integer().notNull().default(1),
  },
  (table) => [
    primaryKey({columns: [table.jobId, table.scopeKey]}),
    check('ai_concurrency_reservations_units_check', sql`${table.units} > 0`),
    index('ai_concurrency_reservations_scope_index').on(table.scopeKey, table.createdAt),
  ],
)

export const aiJobArtifacts = pgTable(
  'ai_job_artifacts',
  {
    archivePendingAt: timestamp({withTimezone: true}),
    contentType: varchar({length: 128}).notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    deleteAttempts: integer().notNull().default(0),
    deletedAt: timestamp({withTimezone: true}),
    durationMs: integer(),
    expiresAt: timestamp({withTimezone: true}),
    id: uuid().primaryKey().defaultRandom(),
    jobId: uuid()
      .notNull()
      .references(() => aiJobs.id, {onDelete: 'cascade'}),
    lastDeleteError: text(),
    lifecycle: aiArtifactLifecycleEnum().notNull().default('temporary'),
    objectKey: text().notNull(),
    pendingObjectKey: text(),
    retentionClass: aiArtifactRetentionClassEnum().notNull(),
    savedAt: timestamp({withTimezone: true}),
    sizeBytes: bigint({mode: 'number'}),
    sourceObjectKey: text(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    uniqueIndex('ai_job_artifacts_object_key_index').on(table.objectKey),
    uniqueIndex('ai_job_artifacts_job_index').on(table.jobId),
    index('ai_job_artifacts_expiry_index').on(table.lifecycle, table.expiresAt),
    index('ai_job_artifacts_user_index').on(table.userId, table.lifecycle),
    check(
      'ai_job_artifacts_size_check',
      sql`${table.sizeBytes} is null or ${table.sizeBytes} >= 0`,
    ),
    check(
      'ai_job_artifacts_duration_check',
      sql`${table.durationMs} is null or ${table.durationMs} >= 0`,
    ),
    /* oxlint-disable eslint-js/max-len -- Keep the generated constraint readable and stable. */
    check(
      // Text comparison permits adding an enum value and its constraint in the same migration transaction.
      'ai_job_artifacts_pending_key_check',
      sql`(${table.lifecycle}::text in ('archiving', 'archive_cleanup_pending', 'deletion_pending') and ${table.pendingObjectKey} is not null)
        or (${table.lifecycle}::text not in ('archiving', 'archive_cleanup_pending', 'deletion_pending') and ${table.pendingObjectKey} is null)`,
    ),
    /* oxlint-enable eslint-js/max-len */
    check('ai_job_artifacts_delete_attempts_check', sql`${table.deleteAttempts} >= 0`),
  ],
)

export const aiCostLedger = pgTable(
  'ai_cost_ledger',
  {
    actualCostMicros: bigint({mode: 'number'}),
    billedUsage: jsonb().$type<AiJobPayload>(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    currency: varchar({length: 3}),
    estimatedCostMicros: bigint({mode: 'number'}),
    id: uuid().primaryKey().defaultRandom(),
    jobId: uuid()
      .notNull()
      .references(() => aiJobs.id, {onDelete: 'cascade'}),
    modelId: varchar({length: 128}).notNull(),
    provider: varchar({length: 64}).notNull(),
    rateVersion: varchar({length: 128}),
    retentionUntil: timestamp({withTimezone: true}).notNull(),
    status: aiCostLedgerStatusEnum().notNull().default('pending'),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ai_cost_ledger_job_index').on(table.jobId),
    index('ai_cost_ledger_retention_index').on(table.retentionUntil),
    check(
      'ai_cost_ledger_estimated_cost_check',
      sql`${table.estimatedCostMicros} is null or ${table.estimatedCostMicros} >= 0`,
    ),
    check(
      'ai_cost_ledger_actual_cost_check',
      sql`${table.actualCostMicros} is null or ${table.actualCostMicros} >= 0`,
    ),
  ],
)
