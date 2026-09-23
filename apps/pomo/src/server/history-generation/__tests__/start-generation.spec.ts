/** @vitest-environment node */
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
  submissionExpiresAt: null,
  submissionState: null,
  targetDate: '2026-08-14',
}

it('should submit a newly prepared run and persist its response ID', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-1'})

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted,
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit,
    }),
  ).resolves.toEqual({
    responseId: 'resp-1',
    runId: 'run-1',
    status: 'submitted',
    targetDate: '2026-08-14',
  })
  expect(submit).toHaveBeenCalledOnce()
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({submissionKey: RUN.openAiSubmissionKey}),
  )
  expect(markSubmitted).toHaveBeenCalledWith('run-1', RUN.openAiSubmissionKey, 'resp-1')
})

it('should submit an existing preparing run with no prior submission', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-1'})

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted,
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: false, run: RUN}),
      submit,
    }),
  ).resolves.toMatchObject({runId: 'run-1', status: 'submitted'})
  expect(submit).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledWith('run-1', RUN.openAiSubmissionKey, 'resp-1')
})

it('should not resubmit an existing unknown submission', async () => {
  const submit = vi.fn()

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted: vi.fn(),
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({
        created: false,
        run: {...RUN, submissionState: 'unknown' as const},
      }),
      submit,
    }),
  ).resolves.toMatchObject({runId: 'run-1', status: 'existing'})
  expect(submit).not.toHaveBeenCalled()
})

it('should submit a run reopened after an expired ambiguous submission', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-retry'})
  const reopenedRun = {
    ...RUN,
    openAiSubmissionKey: '019d0000-0000-7000-8000-000000000004',
  }

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted,
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: reopenedRun}),
      submit,
    }),
  ).resolves.toMatchObject({responseId: 'resp-retry', runId: 'run-1', status: 'submitted'})
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({submissionKey: reopenedRun.openAiSubmissionKey}),
  )
  expect(markSubmitted).toHaveBeenCalledWith(
    reopenedRun.id,
    reopenedRun.openAiSubmissionKey,
    'resp-retry',
  )
})

it('should not submit a duplicate daily run', async () => {
  const submit = vi.fn()

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted: vi.fn(),
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({
        created: false,
        run: {...RUN, openAiResponseId: 'resp-existing', status: 'submitted' as const},
      }),
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
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).toHaveBeenCalledWith('run-1', RUN.openAiSubmissionKey, 'Invalid request')
})

it('should record an ambiguous submission with a recovery deadline', async () => {
  const error = new HistorySubmissionError('unknown', new Error('Response lost'))
  const markFailed = vi.fn()
  const markUnknown = vi.fn().mockResolvedValue(undefined)
  const now = vi
    .fn()
    .mockReturnValueOnce(new Date('2026-08-13T15:30:00.000Z'))
    .mockReturnValueOnce(new Date('2026-08-13T15:35:00.000Z'))

  await expect(
    startHistoryGeneration({
      markFailed,
      markSubmitted: vi.fn(),
      markUnknown,
      now,
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).not.toHaveBeenCalled()
  expect(markUnknown).toHaveBeenCalledWith({
    errorMessage: 'Response lost',
    runId: 'run-1',
    submissionExpiresAt: new Date('2026-08-13T16:05:00.000Z'),
    submissionKey: RUN.openAiSubmissionKey,
  })
  expect(now).toHaveBeenCalledTimes(2)
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
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: true, run: RUN}),
      submit,
    }),
  ).resolves.toMatchObject({responseId: 'resp-accepted', status: 'submitted'})
  expect(submit).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledTimes(2)
  expect(markFailed).not.toHaveBeenCalled()
})

it('should not resubmit after an accepted response becomes persisted', async () => {
  const markFailed = vi.fn()
  const prepare = vi
    .fn()
    .mockResolvedValueOnce({created: true, run: RUN})
    .mockResolvedValueOnce({
      created: false,
      run: {...RUN, openAiResponseId: 'resp-accepted', status: 'submitted' as const},
    })
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-accepted'})
  const dependencies = {
    markFailed,
    markSubmitted: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    markUnknown: vi.fn(),
    now: () => new Date('2026-08-13T15:30:00.000Z'),
    prepare,
    submit,
  }

  await expect(startHistoryGeneration(dependencies)).rejects.toBeInstanceOf(AggregateError)
  await expect(startHistoryGeneration(dependencies)).resolves.toMatchObject({status: 'existing'})
  expect(submit).toHaveBeenCalledOnce()
  expect(markFailed).not.toHaveBeenCalled()
})

it('should not resubmit when accepted response persistence becomes ambiguous', async () => {
  const markFailed = vi.fn()
  const markUnknown = vi.fn().mockResolvedValue(undefined)
  const prepare = vi
    .fn()
    .mockResolvedValueOnce({created: true, run: RUN})
    .mockResolvedValueOnce({
      created: false,
      run: {
        ...RUN,
        submissionExpiresAt: new Date('2026-08-13T16:00:00.000Z'),
        submissionState: 'unknown' as const,
      },
    })
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-accepted'})
  const dependencies = {
    markFailed,
    markSubmitted: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    markUnknown,
    now: () => new Date('2026-08-13T15:30:00.000Z'),
    prepare,
    submit,
  }

  await expect(startHistoryGeneration(dependencies)).rejects.toBeInstanceOf(AggregateError)
  await expect(startHistoryGeneration(dependencies)).resolves.toMatchObject({status: 'existing'})
  expect(markUnknown).toHaveBeenCalledWith({
    errorMessage: 'Failed to persist the accepted OpenAI response ID',
    runId: 'run-1',
    submissionExpiresAt: new Date('2026-08-13T16:00:00.000Z'),
    submissionKey: RUN.openAiSubmissionKey,
  })
  expect(submit).toHaveBeenCalledOnce()
  expect(markFailed).not.toHaveBeenCalled()
})
