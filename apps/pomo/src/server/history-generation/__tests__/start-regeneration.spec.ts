import {expect, it, vi} from 'vitest'

import {HistorySubmissionError} from '../openai-client'
import {startHistoryRegeneration} from '../start-regeneration'

const RUN = {
  id: 'run-1',
  openAiResponseId: null,
  openAiSubmissionKey: '019d0000-0000-7000-8000-000000000002',
  sourcePolicyVersion: 'history-sources-v1',
  status: 'preparing' as const,
  targetDate: '2026-08-16',
}

const OPTIONS = {
  requiredTitles: [
    '1858년, 대서양 횡단 전신 첫 교신',
    '1896년, 유콘에서 금 발견',
    '1977년, 엘비스 프레슬리 사망',
  ],
  targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
}

it('should submit selected moments against the reopened daily run', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)
  const prepare = vi.fn().mockResolvedValue(RUN)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-radio'})

  await expect(
    startHistoryRegeneration(OPTIONS, {
      markFailed: vi.fn(),
      markSubmitted,
      prepare,
      submit,
    }),
  ).resolves.toEqual({
    responseId: 'resp-radio',
    runId: 'run-1',
    status: 'submitted',
    targetDate: '2026-08-16',
  })
  expect(prepare).toHaveBeenCalledWith(
    expect.objectContaining({requiredTitles: OPTIONS.requiredTitles}),
  )
  expect(submit).toHaveBeenCalledWith(
    expect.objectContaining({
      requiredTitles: OPTIONS.requiredTitles,
      submissionKey: RUN.openAiSubmissionKey,
    }),
  )
  expect(markSubmitted).toHaveBeenCalledWith('run-1', 'resp-radio')
})

it('should mark a reopened run as failed after a confirmed rejection', async () => {
  const error = new HistorySubmissionError('rejected', new Error('Invalid request'))
  const markFailed = vi.fn().mockResolvedValue(undefined)

  await expect(
    startHistoryRegeneration(OPTIONS, {
      markFailed,
      markSubmitted: vi.fn(),
      prepare: vi.fn().mockResolvedValue(RUN),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).toHaveBeenCalledWith('run-1', 'Invalid request')
})

it('should preserve an ambiguous reopened submission for webhook recovery', async () => {
  const error = new HistorySubmissionError('unknown', new Error('Response lost'))
  const markFailed = vi.fn()

  await expect(
    startHistoryRegeneration(OPTIONS, {
      markFailed,
      markSubmitted: vi.fn(),
      prepare: vi.fn().mockResolvedValue(RUN),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).not.toHaveBeenCalled()
})

it('should retry reopened response ID persistence without submitting again', async () => {
  const error = new Error('Database unavailable')
  const markFailed = vi.fn()
  const markSubmitted = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined)
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-accepted'})

  await expect(
    startHistoryRegeneration(OPTIONS, {
      markFailed,
      markSubmitted,
      prepare: vi.fn().mockResolvedValue(RUN),
      submit,
    }),
  ).resolves.toMatchObject({responseId: 'resp-accepted', status: 'submitted'})
  expect(submit).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledTimes(2)
  expect(markFailed).not.toHaveBeenCalled()
})
