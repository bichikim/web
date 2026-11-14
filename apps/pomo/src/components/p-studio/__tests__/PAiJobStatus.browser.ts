import {render} from '@solidjs/testing-library'
import {page} from 'vitest/browser'
import {createComponent} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {PAiJobStatus} from '../PAiJobStatus'
import {type AiJobClient, AiJobClientError} from '../../../features/ai-job/client'
import type {AiJob} from '../../../features/ai-job/contracts'
import {useAiTextJob} from '../../../features/ai-job/use-ai-text-job'

vi.mock('src/features/ai-job/release', () => ({SERVER_AI_RELEASED: true}))

const completedJob: AiJob = {
  capability: 'text',
  completedAt: '2026-09-21T01:00:00.000Z',
  createdAt: '2026-09-21T00:59:00.000Z',
  error: null,
  id: 'completed-job',
  lastRunnerError: null,
  modelId: 'gpt-5.6-luna',
  progress: 100,
  result: null,
  startedAt: '2026-09-21T00:59:10.000Z',
  status: 'succeeded',
  timeoutAt: '2026-09-21T01:10:00.000Z',
  updatedAt: '2026-09-21T01:00:00.000Z',
}

it('should replace false success with retry and recover the same result on reentry', async () => {
  const getJobResult = vi
    .fn()
    .mockRejectedValueOnce(new AiJobClientError({code: 'ai_artifact_not_available', status: 404}))
    .mockResolvedValue({text: '복원한 답변'})
  const client: AiJobClient = {
    cancelJob: vi.fn(async (): Promise<AiJob> => ({...completedJob, status: 'cancelled'})),
    deleteJobArtifact: vi.fn(async () => ({deleted: true})),
    getJob: vi.fn(async () => completedJob),
    getJobResult,
    readTextAccess: vi.fn(async () => ({available: true, modelId: 'gpt-5.6-luna'})),
    saveJobArtifact: vi.fn(async () => ({text: '복원한 답변'})),
    submitTextJob: vi.fn(async () => ({created: true, job: completedJob})),
  }
  const onComplete = vi.fn(async () => undefined)
  const view = render(() => {
    const job = useAiTextJob({
      client,
      onComplete,
      storage: {
        clear: vi.fn(),
        read: () => ({
          idempotencyKey: 'same-request',
          input: {messages: [{content: '복원', role: 'user'}]},
          jobId: completedJob.id,
        }),
        write: vi.fn(),
      },
    })
    return createComponent(PAiJobStatus, {job})
  })
  try {
    await expect.element(page.getByRole('button', {exact: true, name: '다시 시도'})).toBeVisible()
    await expect
      .element(page.getByText('AI 답변이 준비됐어요.', {exact: true}))
      .not.toBeInTheDocument()
    await page.getByRole('button', {exact: true, name: '다시 시도'}).click()
    await expect.element(page.getByText('AI 답변이 준비됐어요.', {exact: true})).toBeVisible()
    await expect
      .element(page.getByRole('button', {exact: true, name: '결과 다시 읽기'}))
      .toBeVisible()
    expect(client.submitTextJob).not.toHaveBeenCalled()
    expect(getJobResult).toHaveBeenNthCalledWith(1, completedJob.id)
    expect(getJobResult).toHaveBeenNthCalledWith(2, completedJob.id)
    expect(onComplete).not.toHaveBeenCalled()
  } finally {
    view.unmount()
  }
})
