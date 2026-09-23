/** @vitest-environment node */

import {describe, expect, it, vi} from 'vitest'

import {type AiJobClient} from '../features/ai-job/client'
import type {AiJob, AiJobResult} from '../features/ai-job/contracts'
import {createAiJobOutput} from '../features/ai-job/create-ai-job-output'
import {createAiJobSession} from '../features/ai-job/create-ai-job-session'

const completedJob: AiJob = {
  capability: 'text',
  completedAt: '2026-09-21T01:00:00.000Z',
  createdAt: '2026-09-21T00:59:00.000Z',
  error: null,
  id: 'job-1',
  lastRunnerError: null,
  modelId: 'gpt-5.6-luna',
  progress: 100,
  result: {text: '답변'},
  startedAt: '2026-09-21T00:59:10.000Z',
  status: 'succeeded',
  timeoutAt: '2026-09-21T01:10:00.000Z',
  updatedAt: '2026-09-21T01:00:00.000Z',
}

const fetchedResult: AiJobResult = {text: '서버 답변'}

const createClient = (): AiJobClient => ({
  cancelJob: vi.fn(),
  deleteJobArtifact: vi.fn(),
  getJob: vi.fn(),
  getJobResult: vi.fn(async () => fetchedResult),
  readTextAccess: vi.fn(),
  saveJobArtifact: vi.fn(),
  submitTextJob: vi.fn(),
})

describe('createAiJobOutput speak retry', () => {
  it('should auto-speak again after TTS fails once the result fetch succeeded', async () => {
    const client = createClient()
    const session = createAiJobSession({
      clear: vi.fn(),
      read: vi.fn(() => null),
      write: vi.fn(),
    })
    const onComplete = vi
      .fn()
      .mockRejectedValueOnce(new Error('TTS unavailable'))
      .mockResolvedValue(undefined)
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

    const firstRevision = session.begin()
    expect(await loadResult(completedJob, firstRevision, true)).toBe(false)
    expect(onComplete).toHaveBeenCalledOnce()

    const secondRevision = session.begin()
    expect(await loadResult(completedJob, secondRevision, true)).toBe(true)
    expect(onComplete).toHaveBeenCalledTimes(2)
  })
})
