import {expect, it, vi} from 'vitest'

import {HistorySubmissionError} from '../openai-client'
import {startHistoryGeneration} from '../start-generation'

vi.mock('src/env', () => ({env: {}}))

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
    expect.objectContaining({submissionKey: RUN.openAiSubmissionKey}),
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

it('should record a confirmed submission rejection before propagating it', async () => {
  const error = new HistorySubmissionError('rejected', new Error('Invalid request'))
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
  expect(markFailed).toHaveBeenCalledWith('run-1', 'Invalid request')
})

it('should preserve an ambiguous submission failure for webhook recovery', async () => {
  const error = new HistorySubmissionError('unknown', new Error('Response lost'))
  const markFailed = vi.fn()

  await expect(
    startHistoryGeneration({
      markFailed,
      markSubmitted: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).not.toHaveBeenCalled()
})

it('should retry response ID persistence without submitting again', async () => {
  const error = new Error('Database unavailable')
  const markFailed = vi.fn()
  const markSubmitted = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-accepted'})

  await expect(
    startHistoryGeneration({
      markFailed,
      markSubmitted,
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit,
    }),
  ).resolves.toMatchObject({responseId: 'resp-accepted', status: 'submitted'})
  expect(submit).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledTimes(2)
  expect(markFailed).not.toHaveBeenCalled()
})

it('should not resubmit an accepted response when persistence remains unavailable', async () => {
  const markFailed = vi.fn()
  const prepare = vi
    .fn()
    .mockResolvedValueOnce({created: true, run: RUN})
    .mockResolvedValueOnce({created: false, run: RUN})
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-accepted'})
  const dependencies = {
    markFailed,
    markSubmitted: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    now: () => new Date('2026-08-13T15:30:00.000Z'),
    prepare,
    submit,
  }

  await expect(startHistoryGeneration(dependencies)).rejects.toBeInstanceOf(AggregateError)
  await expect(startHistoryGeneration(dependencies)).resolves.toMatchObject({status: 'existing'})
  expect(submit).toHaveBeenCalledOnce()
  expect(markFailed).not.toHaveBeenCalled()
})
