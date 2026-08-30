import {expect, it, vi} from 'vitest'

import {persistGenerationSubmission} from '../submission-persistence'

it('should persist an accepted response once', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)

  await persistGenerationSubmission('run-id', 'response-id', markSubmitted)

  expect(markSubmitted).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledWith('run-id', 'response-id')
})

it('should retry one transient persistence failure', async () => {
  const markSubmitted = vi
    .fn()
    .mockRejectedValueOnce(new Error('transient'))
    .mockResolvedValueOnce(undefined)

  await persistGenerationSubmission('run-id', 'response-id', markSubmitted)

  expect(markSubmitted).toHaveBeenCalledTimes(2)
})

it('should preserve both persistence failures', async () => {
  const firstError = new Error('first')
  const retryError = new Error('retry')
  const markSubmitted = vi.fn().mockRejectedValueOnce(firstError).mockRejectedValueOnce(retryError)

  const result = persistGenerationSubmission('run-id', 'response-id', markSubmitted)

  await expect(result).rejects.toMatchObject({
    errors: [firstError, retryError],
    message: 'Failed to persist the accepted OpenAI response ID',
  })
})
