import {eq, isNull} from 'drizzle-orm'

import {
  aiJobArtifacts,
  type AiJobPayload,
  aiJobs,
  aiJobStatusEnum,
  type Database,
} from 'src/server/database'

export type AiJobStatus = (typeof aiJobStatusEnum.enumValues)[number]

export const MAXIMUM_PROGRESS = 100
export const MAXIMUM_RECOVERY_JOBS = 100
const MILLISECONDS_PER_SECOND = 1_000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_DAY = 24
const INTERMEDIATE_RETENTION_DAYS = 1
export const INTERMEDIATE_RETENTION_MILLISECONDS =
  INTERMEDIATE_RETENTION_DAYS *
  MINUTES_PER_DAY *
  SECONDS_PER_MINUTE *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND
export const ARCHIVE_OPERATION_STALE_MILLISECONDS =
  MINUTES_PER_DAY * SECONDS_PER_MINUTE * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface AiJobRecord {
  readonly attemptCount: number
  readonly capability: (typeof aiJobs.$inferSelect)['capability']
  readonly completedAt: Date | null
  readonly createdAt: Date
  readonly dispatchLeaseUntil: Date | null
  readonly errorCode: string | null
  readonly errorMessage: string | null
  readonly estimatedCredits: number | null
  readonly id: string
  readonly idempotencyKey: string
  readonly intermediateCleanupAt: Date | null
  readonly lastRunnerError: string | null
  readonly lastSubmissionError: string | null
  readonly modelId: string
  readonly progress: number
  readonly providerAcceptedAt: Date | null
  readonly quotaUnits: number
  readonly recoveryAttempts: number
  readonly recoveryDeadlineAt: Date | null
  readonly request: AiJobPayload
  readonly requestHash: string
  readonly result: AiJobPayload | null
  readonly runnerJobId: string | null
  readonly settledCredits: number | null
  readonly submissionState: (typeof aiJobs.$inferSelect)['submissionState']
  readonly startedAt: Date | null
  readonly status: AiJobStatus
  readonly timeoutAt: Date
  readonly updatedAt: Date
  readonly usagePeriodStart: string
  readonly usagePeriodEnd: string | null
  readonly userId: string
}

export interface AiArtifactRecord {
  readonly archivePendingAt: Date | null
  readonly contentType: string
  readonly createdAt: Date
  readonly deleteAttempts: number
  readonly deletedAt: Date | null
  readonly durationMs: number | null
  readonly expiresAt: Date | null
  readonly id: string
  readonly jobId: string
  readonly lastDeleteError: string | null
  readonly lifecycle: (typeof aiJobArtifacts.$inferSelect)['lifecycle']
  readonly objectKey: string
  readonly pendingObjectKey: string | null
  readonly retentionClass: (typeof aiJobArtifacts.$inferSelect)['retentionClass']
  readonly savedAt: Date | null
  readonly sizeBytes: number | null
  readonly sourceObjectKey: string | null
  readonly userId: string
}

export type AiArtifactLifecycle = (typeof aiJobArtifacts.$inferSelect)['lifecycle']

export interface AiArtifactStateExpectation {
  readonly expectedPendingObjectKey?: string | null
  readonly expectedLifecycle?: AiArtifactLifecycle
  readonly expectedObjectKey?: string
  readonly expectedSourceObjectKey?: string | null
}

export const getAiArtifactStateConditions = (
  artifactId: string,
  expectation: AiArtifactStateExpectation = {},
) => {
  const conditions = [eq(aiJobArtifacts.id, artifactId)]

  if (expectation.expectedLifecycle !== undefined) {
    conditions.push(eq(aiJobArtifacts.lifecycle, expectation.expectedLifecycle))
  }
  if (expectation.expectedObjectKey !== undefined) {
    conditions.push(eq(aiJobArtifacts.objectKey, expectation.expectedObjectKey))
  }
  if (expectation.expectedSourceObjectKey === null) {
    conditions.push(isNull(aiJobArtifacts.sourceObjectKey))
  } else if (expectation.expectedSourceObjectKey !== undefined) {
    conditions.push(eq(aiJobArtifacts.sourceObjectKey, expectation.expectedSourceObjectKey))
  }

  if (expectation.expectedPendingObjectKey === null) {
    conditions.push(isNull(aiJobArtifacts.pendingObjectKey))
  } else if (expectation.expectedPendingObjectKey !== undefined) {
    conditions.push(eq(aiJobArtifacts.pendingObjectKey, expectation.expectedPendingObjectKey))
  }

  return conditions
}

export type CreateAiJobResult =
  | {readonly kind: 'created'; readonly job: AiJobRecord}
  | {readonly kind: 'existing'; readonly job: AiJobRecord}
  | {readonly kind: 'idempotency-conflict'; readonly job: AiJobRecord}
  | {readonly kind: 'not-entitled'}
  | {readonly kind: 'queue-exceeded'}
  | {readonly kind: 'quota-exceeded'}

export interface CreateAiJobInput {
  readonly capability: (typeof aiJobs.$inferInsert)['capability']
  readonly estimatedCredits: number | null
  readonly idempotencyKey: string
  readonly modelId: string
  readonly quotaUnits: number
  readonly request: AiJobPayload
  readonly requestHash: string
  readonly timeoutAt: Date
  readonly usagePeriodStart: string
  readonly userId: string
}

export interface FinalizeAiJobInput {
  readonly acceptBeforeTimeout?: boolean
  readonly actualCostMicros?: number | null
  readonly billedUsage?: AiJobPayload | null
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly rateVersion?: string | null
  readonly progress?: number
  readonly providerCostStatus?: 'cancelled' | 'unknown'
  readonly result?: AiJobPayload | null
  readonly settledCredits?: number | null
  readonly status: Extract<AiJobStatus, 'cancelled' | 'failed' | 'succeeded' | 'timed_out'>
}

export class AiLimitExceededError extends Error {
  constructor(
    readonly kind: 'queue-exceeded' | 'quota-exceeded',
    message: string,
  ) {
    super(message)
  }
}

const TERMINAL_STATUSES: ReadonlyArray<AiJobStatus> = [
  'cancelled',
  'failed',
  'succeeded',
  'timed_out',
]

export const isTerminalStatus = (status: AiJobStatus): boolean => TERMINAL_STATUSES.includes(status)

export const mapAiJob = (job: typeof aiJobs.$inferSelect): AiJobRecord => ({
  attemptCount: job.attemptCount,
  capability: job.capability,
  completedAt: job.completedAt,
  createdAt: job.createdAt,
  dispatchLeaseUntil: job.dispatchLeaseUntil,
  errorCode: job.errorCode,
  errorMessage: job.errorMessage,
  estimatedCredits: job.estimatedCredits,
  id: job.id,
  idempotencyKey: job.idempotencyKey,
  intermediateCleanupAt: job.intermediateCleanupAt,
  lastRunnerError: job.lastRunnerError,
  lastSubmissionError: job.lastSubmissionError,
  modelId: job.modelId,
  progress: job.progress,
  providerAcceptedAt: job.providerAcceptedAt,
  quotaUnits: job.quotaUnits,
  recoveryAttempts: job.recoveryAttempts,
  recoveryDeadlineAt: job.recoveryDeadlineAt,
  request: job.request,
  requestHash: job.requestHash,
  result: job.result,
  runnerJobId: job.runnerJobId,
  settledCredits: job.settledCredits,
  startedAt: job.startedAt,
  status: job.status,
  submissionState: job.submissionState,
  timeoutAt: job.timeoutAt,
  updatedAt: job.updatedAt,
  usagePeriodEnd: job.usagePeriodEnd,
  usagePeriodStart: job.usagePeriodStart,
  userId: job.userId,
})

interface PersistedAiArtifact {
  readonly contentType?: unknown
  readonly durationMs?: unknown
  readonly objectKey: string
  readonly sizeBytes?: unknown
}

export const getPersistedAiArtifact = (
  result: AiJobPayload | null | undefined,
): PersistedAiArtifact | null => {
  if (result === null || result === undefined) {
    return null
  }

  const {artifact} = result
  if (typeof artifact !== 'object' || artifact === null || !('objectKey' in artifact)) {
    return null
  }

  const {objectKey} = artifact
  return typeof objectKey === 'string' ? (artifact as PersistedAiArtifact) : null
}

export const replaceAiJobArtifactObjectKey = (
  result: AiJobPayload | null,
  objectKey: string,
): AiJobPayload | null => {
  if (result === null || typeof result.artifact !== 'object' || result.artifact === null) {
    return result
  }

  return {
    ...result,
    artifact: {
      ...(result.artifact as AiJobPayload),
      objectKey,
    },
  }
}

export const readJobById = async (
  database: Database,
  jobId: string,
): Promise<AiJobRecord | null> => {
  const [job] = await database.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1)
  return job === undefined ? null : mapAiJob(job)
}

export const mapAiArtifact = (artifact: typeof aiJobArtifacts.$inferSelect): AiArtifactRecord => ({
  archivePendingAt: artifact.archivePendingAt,
  contentType: artifact.contentType,
  createdAt: artifact.createdAt,
  deleteAttempts: artifact.deleteAttempts,
  deletedAt: artifact.deletedAt,
  durationMs: artifact.durationMs,
  expiresAt: artifact.expiresAt,
  id: artifact.id,
  jobId: artifact.jobId,
  lastDeleteError: artifact.lastDeleteError,
  lifecycle: artifact.lifecycle,
  objectKey: artifact.objectKey,
  pendingObjectKey: artifact.pendingObjectKey,
  retentionClass: artifact.retentionClass,
  savedAt: artifact.savedAt,
  sizeBytes: artifact.sizeBytes,
  sourceObjectKey: artifact.sourceObjectKey,
  userId: artifact.userId,
})

/** Creates one durable AI job and reserves quota inside the same transaction. */
