// oxlint-disable no-magic-numbers -- SQLite progress bounds and retry-safe timestamps are protocol values.

import {createHash} from 'node:crypto'
import {DatabaseSync, type SQLInputValue} from 'node:sqlite'

import {
  type AiRunnerJobRequest,
  aiRunnerJobRequestSchema,
  aiRunnerJobStatusSchema,
} from '../ai/runner-contract.ts'
import {RunnerRequestConflictError} from './errors.ts'
import type {RunnerError, RunnerJobRecord, RunnerMetrics} from './types.ts'

interface SqliteRow {
  readonly [key: string]: unknown
}

export interface RunnerJobStore {
  claimNext(): RunnerJobRecord | null
  close(): void
  create(request: AiRunnerJobRequest): {readonly created: boolean; readonly job: RunnerJobRecord}
  finishCancelled(jobId: string, now: number): RunnerJobRecord | null
  finishFailure(
    jobId: string,
    error: RunnerError,
    metrics: RunnerMetrics,
    now: number,
  ): RunnerJobRecord | null
  finishSuccess(
    jobId: string,
    result: Record<string, unknown>,
    metrics: RunnerMetrics,
    now: number,
  ): RunnerJobRecord | null
  get(jobId: string): RunnerJobRecord | null
  hasQueued(): boolean
  markCancelRequested(jobId: string, now: number): RunnerJobRecord | null
  recoverRunningJobs(now: number): number
  updateProgress(jobId: string, progress: number, now: number): void
}

interface CreateRunnerJobStoreOptions {
  readonly now?: () => number
}

const JOB_STATUS_VALUES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const
const JOB_STATUS_SQL = JOB_STATUS_VALUES.map((value) => `'${value}'`).join(', ')

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const getString = (row: SqliteRow, key: string): string => {
  const value = row[key]

  if (typeof value !== 'string') {
    throw new Error(`Runner database column ${key} is not a string`)
  }

  return value
}

const getOptionalString = (row: SqliteRow, key: string): string | null => {
  const value = row[key]

  if (value === null || value === undefined) {
    return null
  }

  return getString(row, key)
}

const getNumber = (row: SqliteRow, key: string): number => {
  const value = row[key]
  const numberValue = typeof value === 'bigint' ? Number(value) : value

  if (typeof numberValue !== 'number' || !Number.isFinite(numberValue)) {
    throw new Error(`Runner database column ${key} is not a number`)
  }

  return numberValue
}

const parseJson = (value: string | null): unknown => (value === null ? null : JSON.parse(value))

const getJsonRecord = (row: SqliteRow, key: string): Record<string, unknown> | null => {
  const value = parseJson(getOptionalString(row, key))

  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    throw new Error(`Runner database column ${key} is not an object`)
  }

  return value
}

const stableJson = (value: unknown): string => {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value)
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
    return `{${entries.join(',')}}`
  }

  throw new TypeError('Runner request contains an unsupported JSON value')
}

const hashRequest = (request: AiRunnerJobRequest): string =>
  createHash('sha256').update(stableJson(request)).digest('hex')

const toSqlValue = (value: string | number | null): SQLInputValue => value

export class SqliteRunnerJobStore implements RunnerJobStore {
  readonly #database: DatabaseSync
  readonly #now: () => number

  constructor(path: string, options: CreateRunnerJobStoreOptions = {}) {
    this.#database = new DatabaseSync(path)
    this.#now = options.now ?? Date.now
    this.#database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS runner_jobs (
        job_id TEXT PRIMARY KEY NOT NULL,
        request_hash TEXT NOT NULL,
        request_json TEXT NOT NULL,
        capability TEXT NOT NULL,
        model_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN (${JOB_STATUS_SQL})),
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        finished_at INTEGER,
        cancel_requested INTEGER NOT NULL DEFAULT 0 CHECK (cancel_requested IN (0, 1)),
        recovery_count INTEGER NOT NULL DEFAULT 0,
        result_json TEXT,
        error_code TEXT,
        error_message TEXT,
        inference_ms INTEGER,
        queue_ms INTEGER
      );
      CREATE INDEX IF NOT EXISTS runner_jobs_queue_index
        ON runner_jobs (status, created_at);
    `)
  }

  create(request: AiRunnerJobRequest): {readonly created: boolean; readonly job: RunnerJobRecord} {
    const parsedRequest = aiRunnerJobRequestSchema.parse(request)
    const now = this.#now()
    const requestJson = stableJson(parsedRequest)
    const inserted = this.#database
      .prepare(
        `INSERT INTO runner_jobs (
          job_id, request_hash, request_json, capability, model_id, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?)
        ON CONFLICT(job_id) DO NOTHING`,
      )
      .run(
        parsedRequest.jobId,
        hashRequest(parsedRequest),
        requestJson,
        parsedRequest.capability,
        parsedRequest.modelId,
        toSqlValue(now),
        toSqlValue(now),
      )

    const job = this.get(parsedRequest.jobId)

    if (job === null) {
      throw new Error('Runner job disappeared immediately after insertion')
    }

    if (Number(inserted.changes) > 0) {
      return {created: true, job}
    }

    if (hashRequest(job.request) !== hashRequest(parsedRequest)) {
      throw new RunnerRequestConflictError()
    }

    return {created: false, job}
  }

  get(jobId: string): RunnerJobRecord | null {
    const row = this.#database.prepare('SELECT * FROM runner_jobs WHERE job_id = ?').get(jobId) as
      | SqliteRow
      | undefined
    return row === undefined ? null : this.#mapRow(row)
  }

  claimNext(): RunnerJobRecord | null {
    const now = this.#now()
    const row = this.#database
      .prepare(`
      UPDATE runner_jobs SET status = 'running', started_at = ?, updated_at = ?,
        queue_ms = MAX(0, ? - created_at)
      WHERE job_id = (
        SELECT job_id FROM runner_jobs
        WHERE status = 'queued' AND cancel_requested = 0
        ORDER BY created_at ASC, job_id ASC LIMIT 1
      ) AND status = 'queued' AND NOT EXISTS (
        SELECT 1 FROM runner_jobs WHERE status = 'running'
      ) RETURNING *
    `)
      .get(now, now, now) as SqliteRow | undefined
    return row === undefined ? null : this.#mapRow(row)
  }

  markCancelRequested(jobId: string, now: number): RunnerJobRecord | null {
    const job = this.get(jobId)

    if (job === null) {
      return null
    }

    if (job.status === 'queued') {
      this.#database
        .prepare(
          `UPDATE runner_jobs
           SET status = 'cancelled', cancel_requested = 1, finished_at = ?, updated_at = ?, progress = 0
           WHERE job_id = ? AND status = 'queued'`,
        )
        .run(toSqlValue(now), toSqlValue(now), jobId)
    } else if (job.status === 'running') {
      this.#database
        .prepare(
          `UPDATE runner_jobs SET cancel_requested = 1, updated_at = ?
           WHERE job_id = ? AND status = 'running'`,
        )
        .run(toSqlValue(now), jobId)
    }

    return this.get(jobId)
  }

  updateProgress(jobId: string, progress: number, now: number): void {
    const boundedProgress = Math.max(0, Math.min(100, Math.trunc(progress)))
    this.#database
      .prepare(
        `UPDATE runner_jobs
         SET progress = MAX(progress, ?), updated_at = ?
         WHERE job_id = ? AND status = 'running'`,
      )
      .run(toSqlValue(boundedProgress), toSqlValue(now), jobId)
  }

  finishSuccess(
    jobId: string,
    result: Record<string, unknown>,
    metrics: RunnerMetrics,
    now: number,
  ): RunnerJobRecord | null {
    this.#database
      .prepare(
        `UPDATE runner_jobs
         SET status = 'succeeded', progress = 100, finished_at = ?, updated_at = ?,
             result_json = ?, error_code = NULL, error_message = NULL,
             inference_ms = ?, queue_ms = ?, cancel_requested = 0
         WHERE job_id = ? AND status = 'running'`,
      )
      .run(
        toSqlValue(now),
        toSqlValue(now),
        JSON.stringify(result),
        toSqlValue(metrics.inferenceMs ?? null),
        toSqlValue(metrics.queueMs ?? null),
        jobId,
      )
    return this.get(jobId)
  }

  finishFailure(
    jobId: string,
    error: RunnerError,
    metrics: RunnerMetrics,
    now: number,
  ): RunnerJobRecord | null {
    this.#database
      .prepare(
        `UPDATE runner_jobs
         SET status = 'failed', finished_at = ?, updated_at = ?,
             error_code = ?, error_message = ?, result_json = NULL,
             inference_ms = ?, queue_ms = ?, cancel_requested = 0
         WHERE job_id = ? AND status = 'running'`,
      )
      .run(
        toSqlValue(now),
        toSqlValue(now),
        error.code,
        error.message,
        toSqlValue(metrics.inferenceMs ?? null),
        toSqlValue(metrics.queueMs ?? null),
        jobId,
      )
    return this.get(jobId)
  }

  finishCancelled(jobId: string, now: number): RunnerJobRecord | null {
    this.#database
      .prepare(
        `UPDATE runner_jobs
         SET status = 'cancelled', finished_at = ?, updated_at = ?,
             error_code = NULL, error_message = NULL, result_json = NULL,
             cancel_requested = 1
         WHERE job_id = ? AND status = 'running'`,
      )
      .run(toSqlValue(now), toSqlValue(now), jobId)
    return this.get(jobId)
  }

  recoverRunningJobs(now: number): number {
    const result = this.#database
      .prepare(
        `UPDATE runner_jobs
         SET status = CASE WHEN cancel_requested = 1 THEN 'cancelled' ELSE 'queued' END,
             started_at = NULL, updated_at = ?,
             recovery_count = recovery_count + 1
         WHERE status = 'running'`,
      )
      .run(toSqlValue(now))
    return Number(result.changes)
  }

  hasQueued(): boolean {
    const row = this.#database
      .prepare(
        `SELECT 1 AS present FROM runner_jobs
         WHERE status = 'queued' AND cancel_requested = 0 LIMIT 1`,
      )
      .get() as SqliteRow | undefined
    return row !== undefined
  }

  close(): void {
    this.#database.close()
  }

  #mapRow(row: SqliteRow): RunnerJobRecord {
    const status = aiRunnerJobStatusSchema.parse(getString(row, 'status'))
    const request = aiRunnerJobRequestSchema.parse(JSON.parse(getString(row, 'request_json')))
    const errorCode = getOptionalString(row, 'error_code')
    const errorMessage = getOptionalString(row, 'error_message')

    return {
      cancelRequested: getNumber(row, 'cancel_requested') === 1,
      createdAt: getNumber(row, 'created_at'),
      error:
        errorCode === null || errorMessage === null
          ? null
          : {code: errorCode, message: errorMessage},
      finishedAt: getNumberOrNull(row, 'finished_at'),
      jobId: getString(row, 'job_id'),
      metrics: getMetrics(row),
      progress: getNumber(row, 'progress'),
      recoveryCount: getNumber(row, 'recovery_count'),
      request,
      result: getJsonRecord(row, 'result_json'),
      startedAt: getNumberOrNull(row, 'started_at'),
      status,
      updatedAt: getNumber(row, 'updated_at'),
    }
  }
}

const getNumberOrNull = (row: SqliteRow, key: string): number | null => {
  const value = row[key]
  return value === null || value === undefined ? null : getNumber(row, key)
}

const getMetrics = (row: SqliteRow): RunnerMetrics | null => {
  const inferenceMs = getNumberOrNull(row, 'inference_ms')
  const queueMs = getNumberOrNull(row, 'queue_ms')
  return inferenceMs === null && queueMs === null
    ? null
    : {inferenceMs: inferenceMs ?? undefined, queueMs: queueMs ?? undefined}
}
