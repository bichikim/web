import type {
  markGenerationSubmissionUnknown,
  markGenerationSubmitted,
} from '../repositories/history-generation'
import {getSubmissionRecoveryDeadline} from './submission-recovery-policy'

type MarkGenerationSubmitted = typeof markGenerationSubmitted
type MarkGenerationSubmissionUnknown = typeof markGenerationSubmissionUnknown

const ACCEPTED_SUBMISSION_PERSISTENCE_ERROR = 'Failed to persist the accepted OpenAI response ID'

interface PersistUnknownGenerationSubmissionOptions {
  readonly errorMessage: string
  readonly markUnknown: MarkGenerationSubmissionUnknown
  readonly runId: string
  readonly submissionExpiresAt: Date
  readonly submissionKey: string
}

const persistWithRetry = async (
  action: () => Promise<void>,
  errorMessage: string,
): Promise<void> => {
  let firstError: unknown

  try {
    await action()
    return
  } catch (error) {
    firstError = error
  }

  try {
    await action()
  } catch (retryError) {
    throw new AggregateError([firstError, retryError], errorMessage)
  }
}

/** Persists an accepted OpenAI response ID, retrying one transient database failure. */
export const persistGenerationSubmission = async (
  runId: string,
  submissionKey: string,
  responseId: string,
  markSubmitted: MarkGenerationSubmitted,
): Promise<void> => {
  await persistWithRetry(
    () => markSubmitted(runId, submissionKey, responseId),
    ACCEPTED_SUBMISSION_PERSISTENCE_ERROR,
  )
}

interface PersistAcceptedGenerationSubmissionOptions {
  readonly markSubmitted: MarkGenerationSubmitted
  readonly markUnknown: MarkGenerationSubmissionUnknown
  readonly now: () => Date
  readonly responseId: string
  readonly runId: string
  readonly submissionKey: string
}

/** Records an accepted response as ambiguous when its response ID cannot be persisted. */
export const persistAcceptedGenerationSubmission = async (
  options: PersistAcceptedGenerationSubmissionOptions,
): Promise<void> => {
  try {
    await persistGenerationSubmission(
      options.runId,
      options.submissionKey,
      options.responseId,
      options.markSubmitted,
    )
  } catch (persistenceError) {
    try {
      await persistUnknownGenerationSubmission({
        errorMessage: ACCEPTED_SUBMISSION_PERSISTENCE_ERROR,
        markUnknown: options.markUnknown,
        runId: options.runId,
        submissionExpiresAt: getSubmissionRecoveryDeadline(options.now()),
        submissionKey: options.submissionKey,
      })
    } catch (ambiguityError) {
      throw new AggregateError(
        [persistenceError, ambiguityError],
        'Failed to persist the accepted OpenAI response ID and its recovery state',
      )
    }

    throw persistenceError
  }
}

/** Persists an ambiguous submission deadline, retrying one transient database failure. */
export const persistUnknownGenerationSubmission = async (
  options: PersistUnknownGenerationSubmissionOptions,
): Promise<void> => {
  await persistWithRetry(
    () =>
      options.markUnknown({
        errorMessage: options.errorMessage,
        runId: options.runId,
        submissionExpiresAt: options.submissionExpiresAt,
        submissionKey: options.submissionKey,
      }),
    'Failed to persist the ambiguous OpenAI submission deadline',
  )
}
