import type {markGenerationSubmitted} from './generation-repository'

type MarkGenerationSubmitted = typeof markGenerationSubmitted

/** Persists an accepted OpenAI response ID, retrying one transient database failure. */
export const persistGenerationSubmission = async (
  runId: string,
  responseId: string,
  markSubmitted: MarkGenerationSubmitted,
): Promise<void> => {
  let firstError: unknown

  try {
    await markSubmitted(runId, responseId)
    return
  } catch (error) {
    firstError = error
  }

  try {
    await markSubmitted(runId, responseId)
  } catch (retryError) {
    throw new AggregateError(
      [firstError, retryError],
      'Failed to persist the accepted OpenAI response ID',
    )
  }
}
