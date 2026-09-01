import type {
  markGenerationSubmissionUnknown,
  markGenerationSubmitted,
} from './generation-repository'

type MarkGenerationSubmitted = typeof markGenerationSubmitted
type MarkGenerationSubmissionUnknown = typeof markGenerationSubmissionUnknown

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
    'Failed to persist the accepted OpenAI response ID',
  )
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
