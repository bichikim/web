import {describe, expect, it, vi} from 'vitest'

import {type AiJobClient, AiJobClientError} from '../client'
import type {AiJob, AiJobResult} from '../contracts'
import {createAiJobOutput} from '../create-ai-job-output'
import {createAiJobSession} from '../create-ai-job-session'

const completedJob: AiJob = {
  capability: 'text',
  completedAt: '2026-09-21T01:00:00.000Z',
  createdAt: '2026-09-21T00:59:00.000Z',
  error: null,
  id: 'job-1',
  lastRunnerError: null,
  modelId: 'gpt-5.6-luna',
  progress: 100,
  result: {text: '스냅샷에만 있는 답변'},
  startedAt: '2026-09-21T00:59:10.000Z',
  status: 'succeeded',
  timeoutAt: '2026-09-21T01:10:00.000Z',
  updatedAt: '2026-09-21T01:00:00.000Z',
}

const createClient = (getJobResult: AiJobClient['getJobResult']): AiJobClient => ({
  cancelJob: vi.fn(async () => completedJob),
  deleteJobArtifact: vi.fn(async () => ({deleted: true})),
  getJob: vi.fn(async () => completedJob),
  getJobResult,
  readTextAccess: vi.fn(async () => ({available: true, modelId: 'gpt-5.6-luna'})),
  saveJobArtifact: vi.fn(async () => ({text: '결과'})),
  submitTextJob: vi.fn(async () => ({created: true, job: completedJob})),
})

describe('createAiJobOutput', () => {
  it('should not speak snapshot text when fetching a completed result fails', async () => {
    const client = createClient(
      vi.fn(async (): Promise<AiJobResult> => {
        throw new AiJobClientError({code: 'ai_artifact_not_available', status: 404})
      }),
    )
    const session = createAiJobSession({
      clear: vi.fn(),
      read: vi.fn(() => null),
      write: vi.fn(),
    })
    const onComplete = vi.fn(async () => undefined)
    const onError = vi.fn()
    const onResult = vi.fn()
    const {loadResult} = createAiJobOutput({
      client,
      onComplete,
      onError,
      onResult,
      result: () => null,
      session,
    })

    const revision = session.begin()
    expect(await loadResult(completedJob, revision, true)).toBe(false)

    expect(onComplete).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith('결과 보관 기간이 지났거나 결과를 더 이상 열 수 없어요.')
    expect(onResult).not.toHaveBeenCalled()
  })

  it('should retry speaking after a completed result was fetched but TTS failed', async () => {
    const result: AiJobResult = {text: '재시도할 답변'}
    const client = createClient(vi.fn(async () => result))
    const session = createAiJobSession({
      clear: vi.fn(),
      read: vi.fn(() => null),
      write: vi.fn(),
    })
    const onComplete = vi.fn(async (_text: string) => undefined)
    onComplete.mockRejectedValueOnce(new Error('transient TTS failure'))
    onComplete.mockResolvedValueOnce(undefined)
    const onError = vi.fn()
    const onResult = vi.fn()
    const {loadResult} = createAiJobOutput({
      client,
      onComplete,
      onError,
      onResult,
      result: () => null,
      session,
    })

    const revision = session.begin()
    expect(await loadResult(completedJob, revision, true)).toBe(false)
    expect(await loadResult(completedJob, revision, true)).toBe(true)

    expect(client.getJobResult).toHaveBeenCalledTimes(2)
    expect(onResult).toHaveBeenNthCalledWith(1, result)
    expect(onResult).toHaveBeenNthCalledWith(2, result)
    expect(onComplete).toHaveBeenNthCalledWith(1, result.text)
    expect(onComplete).toHaveBeenNthCalledWith(2, result.text)
    expect(onError).toHaveBeenCalledWith('음성을 재생하지 못했어요.')
  })

  it('should not repeat successful TTS when its session is superseded', async () => {
    const client = createClient(vi.fn(async () => ({text: '완료된 답변'})))
    const session = createAiJobSession({
      clear: vi.fn(),
      read: vi.fn(() => null),
      write: vi.fn(),
    })
    let nextRevision = 0
    const onComplete = vi.fn(async () => {
      nextRevision = session.begin()
    })
    const {loadResult} = createAiJobOutput({
      client,
      onComplete,
      onError: vi.fn(),
      onResult: vi.fn(),
      result: () => null,
      session,
    })

    const firstRevision = session.begin()
    expect(await loadResult(completedJob, firstRevision, true)).toBe(false)
    expect(await loadResult(completedJob, nextRevision, true)).toBe(true)

    expect(client.getJobResult).toHaveBeenCalledTimes(2)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
