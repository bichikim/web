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
})
