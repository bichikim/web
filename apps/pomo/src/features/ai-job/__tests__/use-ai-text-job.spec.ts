/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type AiJobArtifactDeleteResult, type AiJobClient, AiJobClientError} from '../client'
import type {AiJob, AiJobResult} from '../contracts'
import {useAiTextJob} from '../use-ai-text-job'
import type {AiJobStorage, StoredAiTextJob} from '../storage'

const JOB_ID = 'job-1'
const createJob = (status: AiJob['status'], result: AiJob['result'] = null): AiJob => ({
  capability: 'text',
  completedAt: status === 'succeeded' ? '2026-09-21T01:00:00.000Z' : null,
  createdAt: '2026-09-21T00:59:00.000Z',
  error: null,
  id: JOB_ID,
  lastRunnerError: null,
  modelId: 'gpt-5.6-luna',
  progress: status === 'running' ? 42 : status === 'succeeded' ? 100 : 0,
  result,
  startedAt: status === 'running' || status === 'succeeded' ? '2026-09-21T00:59:10.000Z' : null,
  status,
  timeoutAt: '2026-09-21T01:10:00.000Z',
  updatedAt: '2026-09-21T01:00:00.000Z',
})

const textResult: AiJobResult = {text: '서버 답변입니다.'}

const createStorage = (initial: StoredAiTextJob | null = null): AiJobStorage => {
  let value = initial
  return {
    clear: vi.fn(() => {
      value = null
    }),
    read: vi.fn(() => value),
    write: vi.fn((next) => {
      value = next
    }),
  }
}

const createClient = (overrides: Partial<AiJobClient> = {}): AiJobClient => ({
  cancelJob: vi.fn(async () => createJob('cancelled')),
  deleteJobArtifact: vi.fn(async (): Promise<AiJobArtifactDeleteResult> => ({deleted: true})),
  getJob: vi.fn(async () => createJob('queued')),
  getJobResult: vi.fn(async () => textResult),
  readTextAccess: vi.fn(async () => ({available: true, modelId: 'gpt-5.6-luna'})),
  saveJobArtifact: vi.fn(async () => textResult),
  submitTextJob: vi.fn(async () => ({created: true, job: createJob('queued')})),
  ...overrides,
})

describe('useAiTextJob', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should default entitled users to server Luna and speak a completed result once', async () => {
    const client = createClient()
    const onComplete = vi.fn(async () => undefined)
    const {cleanup, result} = renderHook(() =>
      useAiTextJob({client, onComplete, storage: createStorage()}),
    )

    await vi.waitFor(() => expect(result.executionMode()).toBe('server'))
    expect(result.serverAvailable()).toBe(true)

    await result.submit('집중을 시작하는 방법')

    expect(client.submitTextJob).toHaveBeenCalledWith({
      idempotencyKey: expect.any(String),
      input: {messages: [{content: '집중을 시작하는 방법', role: 'user'}]},
    })
    expect(result.jobStatus()).toBe('queued')

    vi.mocked(client.getJob).mockResolvedValue(createJob('succeeded'))
    await result.refresh()

    expect(client.getJobResult).toHaveBeenCalledWith(JOB_ID)
    expect(result.jobResult()).toEqual(textResult)
    expect(onComplete).toHaveBeenCalledWith('서버 답변입니다.')
    cleanup()
  })

  it('should retry an ambiguous submission with the same idempotency key', async () => {
    const client = createClient({
      submitTextJob: vi
        .fn()
        .mockRejectedValue(new AiJobClientError({code: 'http_503', status: 503})),
    })
    const storage = createStorage()
    const {cleanup, result} = renderHook(() =>
      useAiTextJob({client, onComplete: vi.fn(async () => undefined), storage}),
    )
    await vi.waitFor(() => expect(result.serverAvailable()).toBe(true))

    const firstAttempt = await result.submit('중복 없이 재시도')
    expect(firstAttempt).toBe(false)
    expect(result.jobStatus()).toBe('recovery_pending')
    const firstKey = vi.mocked(client.submitTextJob).mock.calls[0]?.[0].idempotencyKey

    vi.mocked(client.submitTextJob).mockResolvedValue({created: false, job: createJob('queued')})
    await result.retry()

    expect(vi.mocked(client.submitTextJob).mock.calls[1]?.[0].idempotencyKey).toBe(firstKey)
    expect(result.jobStatus()).toBe('queued')
    cleanup()
  })

  it('should ignore a late submission response after cancellation moves the job to recovery', async () => {
    let resolveSubmission: (value: {readonly created: boolean; readonly job: AiJob}) => void = () =>
      undefined
    const submission = new Promise<{readonly created: boolean; readonly job: AiJob}>((resolve) => {
      resolveSubmission = resolve
    })
    const client = createClient({submitTextJob: vi.fn(() => submission)})
    const storage = createStorage()
    const {cleanup, result} = renderHook(() =>
      useAiTextJob({client, onComplete: vi.fn(async () => undefined), storage}),
    )
    await vi.waitFor(() => expect(result.serverAvailable()).toBe(true))

    const submitPromise = result.submit('취소 경합')
    expect(result.jobStatus()).toBe('submitting')
    await result.cancel()
    expect(result.jobStatus()).toBe('recovery_pending')

    resolveSubmission({created: true, job: createJob('queued')})
    await submitPromise

    expect(result.jobStatus()).toBe('recovery_pending')
    expect(storage.read()?.jobId).toBeNull()
    cleanup()
  })

  it('should ignore duplicate cancellation calls while the first request is pending', async () => {
    let resolveCancellation: (job: AiJob) => void = () => undefined
    const cancellation = new Promise<AiJob>((resolve) => {
      resolveCancellation = resolve
    })
    const storage = createStorage({
      idempotencyKey: 'recovery-key',
      input: {messages: [{content: '취소 중복', role: 'user'}]},
      jobId: JOB_ID,
    })
    const client = createClient({cancelJob: vi.fn(() => cancellation)})
    const {cleanup, result} = renderHook(() =>
      useAiTextJob({client, onComplete: vi.fn(async () => undefined), storage}),
    )
    await vi.waitFor(() => expect(result.jobStatus()).toBe('queued'))

    const firstCancellation = result.cancel()
    expect(result.isCancelling()).toBe(true)
    const secondCancellation = await result.cancel()
    expect(secondCancellation).toBe(false)
    expect(client.cancelJob).toHaveBeenCalledTimes(1)

    resolveCancellation(createJob('cancelled'))
    expect(await firstCancellation).toBe(true)
    expect(result.isCancelling()).toBe(false)
    cleanup()
  })

  it('should refresh an artifact URL and report deletion pending without exposing storage keys', async () => {
    const metadata: AiJobResult = {
      artifact: {contentType: 'audio/mpeg', expiresAt: '2026-09-21T01:10:00.000Z'},
    }
    const refreshed: AiJobResult = {
      artifact: {
        contentType: 'audio/mpeg',
        expiresAt: '2026-09-21T01:20:00.000Z',
        url: 'https://assets.example/audio-refreshed.mp3',
      },
    }
    const client = createClient({
      deleteJobArtifact: vi.fn(async () => ({deleted: false, deletionPending: true})),
      getJob: vi.fn(async () => createJob('succeeded', metadata)),
      getJobResult: vi.fn(async () => refreshed),
      saveJobArtifact: vi.fn(async () => refreshed),
    })
    const storage = createStorage({
      idempotencyKey: 'recovery-key',
      input: {messages: [{content: '결과 복구', role: 'user'}]},
      jobId: JOB_ID,
    })
    const {cleanup, result} = renderHook(() =>
      useAiTextJob({client, onComplete: vi.fn(async () => undefined), storage}),
    )
    await vi.waitFor(() => expect(result.jobStatus()).toBe('succeeded'))
    expect(result.jobResult()?.artifact?.url).toBe('https://assets.example/audio-refreshed.mp3')

    vi.mocked(client.getJobResult).mockResolvedValue({
      artifact: {
        contentType: 'audio/mpeg',
        expiresAt: '2026-09-21T01:30:00.000Z',
        url: 'https://assets.example/audio-new.mp3',
      },
    })
    await result.refreshResult()
    expect(result.jobResult()?.artifact?.url).toBe('https://assets.example/audio-new.mp3')

    await result.saveArtifact()
    expect(result.actionMessage()).toContain('저장')
    await result.deleteArtifact()
    expect(result.actionMessage()).toContain('삭제를 접수')
    expect(result.jobResult()?.artifact).toBeUndefined()
    cleanup()
  })
})

// Exercise the retained implementation without changing the production release decision.
vi.mock('src/features/ai-job/release', () => ({SERVER_AI_RELEASED: true}))
