import {expect, it, vi} from 'vitest'

import {startHistoryGeneration} from '../start-generation'

const RUN = {
  id: 'run-1',
  openAiResponseId: null,
  openAiSubmissionKey: '019d0000-0000-7000-8000-000000000001',
  sourcePolicyVersion: 'history-sources-v1',
  status: 'preparing' as const,
  targetDate: '2026-08-15',
}

it('should submit a newly prepared run and persist its response ID', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-1'})

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted,
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit,
    }),
  ).resolves.toEqual({
    responseId: 'resp-1',
    runId: 'run-1',
    status: 'submitted',
    targetDate: '2026-08-15',
  })
  expect(submit).toHaveBeenCalledOnce()
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({idempotencyKey: RUN.openAiSubmissionKey}),
  )
  expect(markSubmitted).toHaveBeenCalledWith('run-1', 'resp-1')
})

it('should not submit a duplicate daily run', async () => {
  const submit = vi.fn()

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: false, run: RUN}),
      submit,
    }),
  ).resolves.toMatchObject({runId: 'run-1', status: 'existing'})
  expect(submit).not.toHaveBeenCalled()
})

it('should record a submission failure before propagating it', async () => {
  const error = new Error('OpenAI unavailable')
  const markFailed = vi.fn().mockResolvedValue(undefined)

  await expect(
    startHistoryGeneration({
      markFailed,
      markSubmitted: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).toHaveBeenCalledWith('run-1', 'OpenAI unavailable')
})

it('should preserve a retryable run when response ID persistence fails', async () => {
  const error = new Error('Database unavailable')
  const markFailed = vi.fn()

  await expect(
    startHistoryGeneration({
      markFailed,
      markSubmitted: vi.fn().mockRejectedValue(error),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit: vi.fn().mockResolvedValue({responseId: 'resp-accepted'}),
    }),
  ).rejects.toBe(error)
  expect(markFailed).toHaveBeenCalledWith('run-1', 'Database unavailable')
})
