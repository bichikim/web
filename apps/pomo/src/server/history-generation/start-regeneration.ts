import {
  HISTORY_PROMPT_VERSION,
  HISTORY_SOURCE_POLICY,
  type HistoryTargetDate,
} from 'src/features/history-generation'
import {
  markGenerationFailed,
  markGenerationSubmitted,
  prepareGenerationRerun,
} from './generation-repository'
import {submitHistoryResponse} from './openai-client'

const MAX_ERROR_LENGTH = 2000

export interface StartRegenerationOptions {
  readonly requiredTitles: ReadonlyArray<string>
  readonly targetDate: HistoryTargetDate
}

export interface StartRegenerationResult {
  readonly responseId: string
  readonly runId: string
  readonly status: 'submitted'
  readonly targetDate: string
}

interface StartRegenerationDependencies {
  readonly markFailed: typeof markGenerationFailed
  readonly markSubmitted: typeof markGenerationSubmitted
  readonly prepare: typeof prepareGenerationRerun
  readonly submit: typeof submitHistoryResponse
}

const DEFAULT_DEPENDENCIES: StartRegenerationDependencies = {
  markFailed: markGenerationFailed,
  markSubmitted: markGenerationSubmitted,
  prepare: prepareGenerationRerun,
  submit: submitHistoryResponse,
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message.slice(0, MAX_ERROR_LENGTH)
    : 'Unknown OpenAI submission error'

/** Reopens one daily run and submits selected moments for replacement. */
export const startHistoryRegeneration = async (
  options: StartRegenerationOptions,
  dependencies: StartRegenerationDependencies = DEFAULT_DEPENDENCIES,
): Promise<StartRegenerationResult> => {
  const run = await dependencies.prepare({
    promptVersion: HISTORY_PROMPT_VERSION,
    requiredTitles: options.requiredTitles,
    sourcePolicyVersion: HISTORY_SOURCE_POLICY.version,
    targetDate: options.targetDate,
  })

  let submitted: Awaited<ReturnType<typeof submitHistoryResponse>>

  try {
    submitted = await dependencies.submit({
      generationRunId: run.id,
      idempotencyKey: run.openAiSubmissionKey,
      policy: HISTORY_SOURCE_POLICY,
      promptVersion: HISTORY_PROMPT_VERSION,
      requiredTitles: options.requiredTitles,
      targetDate: options.targetDate,
    })
  } catch (error) {
    await dependencies.markFailed(run.id, getErrorMessage(error))
    throw error
  }

  try {
    await dependencies.markSubmitted(run.id, submitted.responseId)
  } catch (error) {
    try {
      await dependencies.markFailed(run.id, getErrorMessage(error))
    } catch (markFailedError) {
      throw new AggregateError(
        [error, markFailedError],
        'Failed to persist the OpenAI response ID and retryable run state',
      )
    }

    throw error
  }

  return {
    responseId: submitted.responseId,
    runId: run.id,
    status: 'submitted',
    targetDate: options.targetDate.isoDate,
  }
}
