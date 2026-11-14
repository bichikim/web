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

it.each([
  {first: 'throw', retry: 'throw'},
  {first: 'throw', retry: 'reject'},
  {first: 'reject', retry: 'throw'},
])('should preserve failure identity and order for $first then $retry', async ({first, retry}) => {
  const firstError = new Error('first')
  const retryError = new Error('retry')
  const markSubmitted = vi
    .fn()
    .mockImplementationOnce(() => {
      if (first === 'throw') {
        throw firstError
      }
      return Promise.reject(firstError)
    })
    .mockImplementationOnce(() => {
      if (retry === 'throw') {
        throw retryError
      }
      return Promise.reject(retryError)
    })

  const result = persistGenerationSubmission(
    'run-id',
    'submission-key',
    'response-id',
    markSubmitted,
  )
  const error = await result.catch((failure: unknown) => failure)

  expect(markSubmitted).toHaveBeenCalledTimes(2)
  expect(error).toBeInstanceOf(AggregateError)
  if (!(error instanceof AggregateError)) {
    throw new TypeError('Expected the persistence failures to be aggregated')
  }
  expect(error.errors).toHaveLength(2)
  expect(error.errors[0]).toBe(firstError)
  expect(error.errors[1]).toBe(retryError)
  expect(error.message).toBe('Failed to persist the accepted OpenAI response ID')
})

it('should wait for each persistence attempt before retrying or settling', async () => {
  const first = Promise.withResolvers<void>()
  const retry = Promise.withResolvers<void>()
  const markSubmitted = vi
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(retry.promise)
  const settled = vi.fn()
  const result = persistGenerationSubmission(
    'run-id',
    'submission-key',
    'response-id',
    markSubmitted,
  )
  void result.then(settled, settled)

  expect(markSubmitted).toHaveBeenCalledOnce()
  expect(settled).not.toHaveBeenCalled()
  first.reject(new Error('first'))
  await Promise.resolve()

  expect(markSubmitted).toHaveBeenCalledTimes(2)
  expect(markSubmitted.mock.calls).toEqual([
    ['run-id', 'submission-key', 'response-id'],
    ['run-id', 'submission-key', 'response-id'],
  ])
  expect(settled).not.toHaveBeenCalled()
  retry.resolve()
  await result

  expect(settled).toHaveBeenCalledOnce()
  expect(markSubmitted).toHaveBeenCalledTimes(2)
})

it('should retain an undefined first rejection in the aggregate', async () => {
  const retryError = new Error('retry')
  const markSubmitted = vi.fn().mockRejectedValueOnce(undefined).mockRejectedValueOnce(retryError)
  const result = persistGenerationSubmission(
    'run-id',
    'submission-key',
    'response-id',
    markSubmitted,
  )
  const error = await result.catch((failure: unknown) => failure)

  expect(error).toBeInstanceOf(AggregateError)
  if (!(error instanceof AggregateError)) {
    throw new TypeError('Expected the persistence failures to be aggregated')
  }
  expect(error.errors).toHaveLength(2)
  expect(error.errors[0]).toBeUndefined()
  expect(error.errors[1]).toBe(retryError)
  expect(markSubmitted).toHaveBeenCalledTimes(2)
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
