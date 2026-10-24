/** @vitest-environment node */
import {mkdtemp, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {RunnerRequestConflictError} from '../errors'
import {SqliteRunnerJobStore} from '../store'
import type {AiRunnerJobRequest} from '../../ai/runner-contract'

const jobId = '019d0000-0000-7000-8000-000000000001'

const createRequest = (overrides: Partial<AiRunnerJobRequest> = {}): AiRunnerJobRequest => ({
  capability: 'text',
  input: {messages: [{content: '안녕', role: 'user'}]},
  jobId,
  modelId: 'gemma-4-e2b',
  protocolVersion: 1,
  ...overrides,
})

describe('SqliteRunnerJobStore', () => {
  let directory: string
  let store: SqliteRunnerJobStore

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pomo-ai-runner-store-'))
    store = new SqliteRunnerJobStore(join(directory, 'runner.sqlite'))
  })

  afterEach(async () => {
    store.close()
    await rm(directory, {force: true, recursive: true})
  })

  it('should return the same durable job for an idempotent duplicate request', () => {
    const first = store.create(createRequest())
    const second = store.create(createRequest())

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.job.jobId).toBe(jobId)
    expect(second.job.status).toBe('queued')
  })

  it('should reject a duplicate job ID with a different request hash', () => {
    store.create(createRequest())

    expect(() =>
      store.create(createRequest({input: {messages: [{content: '다른 요청', role: 'user'}]}})),
    ).toThrow(RunnerRequestConflictError)
  })

  it('should recover running work to the queue after a process restart', () => {
    store.create(createRequest())
    expect(store.claimNext()?.status).toBe('running')

    const recovered = store.recoverRunningJobs(Date.now())
    const job = store.get(jobId)

    expect(recovered).toBe(1)
    expect(job).toMatchObject({recoveryCount: 1, status: 'queued'})
  })

  it('should cancel queued work without ever executing it', () => {
    store.create(createRequest())

    const cancelled = store.markCancelRequested(jobId, Date.now())

    expect(cancelled).toMatchObject({cancelRequested: true, status: 'cancelled'})
    expect(store.claimNext()).toBeNull()
  })
})

it('should enforce one inference slot across independent database connections', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'runner-concurrency-'))
  const path = join(directory, 'runner.sqlite')
  const first = new SqliteRunnerJobStore(path)
  const second = new SqliteRunnerJobStore(path)
  try {
    first.create(createRequest())
    second.create(createRequest({jobId: '019d0000-0000-7000-8000-000000000002'}))
    expect(first.claimNext()?.jobId).toBe(jobId)
    expect(second.claimNext()).toBeNull()
    first.finishSuccess(jobId, {text: 'done'}, {}, Date.now())
    expect(second.claimNext()?.jobId).toBe('019d0000-0000-7000-8000-000000000002')
  } finally {
    first.close()
    second.close()
    await rm(directory, {force: true, recursive: true})
  }
})

it('should preserve a persisted cancellation during recovery', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'runner-recovery-'))
  const path = join(directory, 'runner.sqlite')
  const first = new SqliteRunnerJobStore(path)
  first.create(createRequest())
  first.claimNext()
  first.markCancelRequested(jobId, Date.now())
  first.close()
  const restarted = new SqliteRunnerJobStore(path)
  try {
    restarted.recoverRunningJobs(Date.now())
    expect(restarted.get(jobId)?.status).toBe('cancelled')
    expect(restarted.claimNext()).toBeNull()
  } finally {
    restarted.close()
    await rm(directory, {force: true, recursive: true})
  }
})
