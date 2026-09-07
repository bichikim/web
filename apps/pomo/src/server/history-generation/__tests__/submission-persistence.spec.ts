import {expect, it, vi} from 'vitest'

import {
  persistGenerationSubmission,
  persistUnknownGenerationSubmission,
} from '../submission-persistence'

it('should persist an accepted response once', async () => {
  const markSubmitted = vi.fn().mockResolvedValue(undefined)

  await persistGenerationSubmission('run-id', 'submission-key', 'response-id', markSubmitted)

  expect(markSubmitted).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledWith('run-id', 'submission-key', 'response-id')
})

it('should retry one transient persistence failure', async () => {
  const markSubmitted = vi
    .fn()
    .mockRejectedValueOnce(new Error('transient'))
    .mockResolvedValueOnce(undefined)

  await persistGenerationSubmission('run-id', 'submission-key', 'response-id', markSubmitted)

  expect(markSubmitted).toHaveBeenCalledTimes(2)
})

it('should preserve both persistence failures', async () => {
  const firstError = new Error('first')
  const retryError = new Error('retry')
  const markSubmitted = vi.fn().mockRejectedValueOnce(firstError).mockRejectedValueOnce(retryError)

  const result = persistGenerationSubmission(
    'run-id',
    'submission-key',
    'response-id',
    markSubmitted,
  )

  await expect(result).rejects.toMatchObject({
    errors: [firstError, retryError],
    message: 'Failed to persist the accepted OpenAI response ID',
  })
})

it('should persist an ambiguous submission deadline', async () => {
  const markUnknown = vi.fn().mockResolvedValue(undefined)
  const expiresAt = new Date('2026-08-13T16:00:00.000Z')

  await persistUnknownGenerationSubmission({
    errorMessage: 'Response lost',
    markUnknown,
    runId: 'run-id',
    submissionExpiresAt: expiresAt,
    submissionKey: 'submission-key',
  })

  expect(markUnknown).toHaveBeenCalledWith({
    errorMessage: 'Response lost',
    runId: 'run-id',
    submissionExpiresAt: expiresAt,
    submissionKey: 'submission-key',
  })
})

it('should preserve both ambiguous submission persistence failures', async () => {
  const firstError = new Error('first')
  const retryError = new Error('retry')
  const markUnknown = vi.fn().mockRejectedValueOnce(firstError).mockRejectedValueOnce(retryError)

  const result = persistUnknownGenerationSubmission({
    errorMessage: 'Response lost',
    markUnknown,
    runId: 'run-id',
    submissionExpiresAt: new Date('2026-08-13T16:00:00.000Z'),
    submissionKey: 'submission-key',
  })

  await expect(result).rejects.toMatchObject({
    errors: [firstError, retryError],
    message: 'Failed to persist the ambiguous OpenAI submission deadline',
  })
})
