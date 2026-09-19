/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({env: {}}))

import {startHistoryGeneration} from 'src/server/history-generation/start-generation'

const PREPARED_RUN = {
  id: 'run-preparing',
  openAiResponseId: null,
  openAiSubmissionKey: '019d0000-0000-7000-8000-000000000099',
  sourcePolicyVersion: 'history-sources-v1',
  status: 'preparing' as const,
  submissionExpiresAt: null,
  submissionState: null,
  targetDate: '2026-08-14',
}

it('should submit an existing preparing daily run that never received an OpenAI response', async () => {
  const submit = vi.fn().mockResolvedValue({responseId: 'resp-resubmit'})
  const markSubmitted = vi.fn().mockResolvedValue(undefined)

  await expect(
    startHistoryGeneration({
      markFailed: vi.fn(),
      markSubmitted,
      markUnknown: vi.fn(),
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      prepare: vi.fn().mockResolvedValue({created: false, run: PREPARED_RUN}),
      submit,
    }),
  ).resolves.toMatchObject({responseId: 'resp-resubmit', status: 'submitted'})

  expect(submit).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledWith(
    PREPARED_RUN.id,
    PREPARED_RUN.openAiSubmissionKey,
    'resp-resubmit',
  )
})
