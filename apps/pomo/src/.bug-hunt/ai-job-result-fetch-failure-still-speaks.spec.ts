/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {AiJobClientError} from '../features/ai-job/client'
import {createAiJobOutput} from '../features/ai-job/create-ai-job-output'
import type {AiJob, AiJobResult} from '../features/ai-job/contracts'
import {createAiJobSession} from '../features/ai-job/create-ai-job-session'

const JOB: AiJob = {
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

it('should not speak when the dedicated result fetch fails after a succeeded job snapshot', async () => {
  const session = createAiJobSession()
  const [result, setResult] = createSignal<JOB['result']>(null)
  const onComplete = vi.fn(async () => undefined)
  const onError = vi.fn()
  const client = {
    getJobResult: vi.fn(async () => {
      throw new AiJobClientError({code: 'ai_artifact_not_available', status: 404})
    }),
  }

  const {loadResult} = createAiJobOutput({
    client,
    onComplete,
    onError,
    onResult: setResult,
    result,
    session,
  })

  const revision = session.begin()
  await loadResult(JOB, revision, true)

  expect(onComplete).not.toHaveBeenCalled()
  expect(onError).toHaveBeenCalledOnce()
  expect(result()).toBeNull()
})
