/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {
  persistAcceptedGenerationSubmission,
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

it('should record accepted response persistence as ambiguous', async () => {
  const markSubmitted = vi
    .fn()
    .mockRejectedValueOnce(new Error('first'))
    .mockRejectedValueOnce(new Error('retry'))
  const markUnknown = vi.fn().mockResolvedValue(undefined)

  await expect(
    persistAcceptedGenerationSubmission({
      markSubmitted,
      markUnknown,
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      responseId: 'response-id',
      runId: 'run-id',
      submissionKey: 'submission-key',
    }),
  ).rejects.toMatchObject({
    errors: [expect.any(Error), expect.any(Error)],
    message: 'Failed to persist the accepted OpenAI response ID',
  })
  expect(markUnknown).toHaveBeenCalledWith({
    errorMessage: 'Failed to persist the accepted OpenAI response ID',
    runId: 'run-id',
    submissionExpiresAt: new Date('2026-08-13T16:00:00.000Z'),
    submissionKey: 'submission-key',
  })
})

it('should preserve accepted response and ambiguity persistence failures', async () => {
  const persistenceError = new Error('persistence')
  const ambiguityError = new Error('ambiguity')
  const markSubmitted = vi
    .fn()
    .mockRejectedValueOnce(persistenceError)
    .mockRejectedValueOnce(persistenceError)
  const markUnknown = vi
    .fn()
    .mockRejectedValueOnce(ambiguityError)
    .mockRejectedValueOnce(ambiguityError)

  await expect(
    persistAcceptedGenerationSubmission({
      markSubmitted,
      markUnknown,
      now: () => new Date('2026-08-13T15:30:00.000Z'),
      responseId: 'response-id',
      runId: 'run-id',
      submissionKey: 'submission-key',
    }),
  ).rejects.toMatchObject({
    errors: [expect.any(AggregateError), expect.any(AggregateError)],
    message: 'Failed to persist the accepted OpenAI response ID and its recovery state',
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
