import {expect, it, vi} from 'vitest'

import {startHistoryRegeneration} from '../start-regeneration'

const RUN = {
  id: 'run-1',
  openAiResponseId: null,
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
    expect.objectContaining({requiredTitles: OPTIONS.requiredTitles}),
  )
  expect(markSubmitted).toHaveBeenCalledWith('run-1', 'resp-radio')
})

it('should mark a reopened run as failed when submission fails', async () => {
  const error = new Error('OpenAI unavailable')
  const markFailed = vi.fn().mockResolvedValue(undefined)

  await expect(
    startHistoryRegeneration(OPTIONS, {
      markFailed,
      markSubmitted: vi.fn(),
      prepare: vi.fn().mockResolvedValue(RUN),
      submit: vi.fn().mockRejectedValue(error),
    }),
  ).rejects.toBe(error)
  expect(markFailed).toHaveBeenCalledWith('run-1', 'OpenAI unavailable')
})
