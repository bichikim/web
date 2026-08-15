import {
  getNextKoreanDate,
  HISTORY_PROMPT_VERSION,
  HISTORY_SOURCE_POLICY,
} from '../../features/history-generation'
import {
  markGenerationFailed,
  markGenerationSubmitted,
  prepareGenerationRun,
} from './generation-repository'
import {submitHistoryResponse} from './openai-client'

const MAX_ERROR_LENGTH = 2000

export interface StartGenerationResult {
  readonly responseId: string | null
  readonly runId: string
  readonly status: 'existing' | 'submitted'
  readonly targetDate: string
}

interface StartGenerationDependencies {
  readonly markFailed: typeof markGenerationFailed
  readonly markSubmitted: typeof markGenerationSubmitted
  readonly now: () => Date
  readonly prepare: typeof prepareGenerationRun
  readonly submit: typeof submitHistoryResponse
}

const DEFAULT_DEPENDENCIES: StartGenerationDependencies = {
  markFailed: markGenerationFailed,
  markSubmitted: markGenerationSubmitted,
  now: () => new Date(),
  prepare: prepareGenerationRun,
  submit: submitHistoryResponse,
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error
    ? error.message.slice(0, MAX_ERROR_LENGTH)
    : 'Unknown OpenAI submission error'

/** Creates the next daily run and returns after OpenAI accepts the background response. */
export const startHistoryGeneration = async (
  dependencies: StartGenerationDependencies = DEFAULT_DEPENDENCIES,
): Promise<StartGenerationResult> => {
  const targetDate = getNextKoreanDate(dependencies.now())
  const prepared = await dependencies.prepare({
    promptVersion: HISTORY_PROMPT_VERSION,
    sourcePolicyVersion: HISTORY_SOURCE_POLICY.version,
    targetDate,
  })

  if (!prepared.created) {
    return {
      responseId: prepared.run.openAiResponseId,
      runId: prepared.run.id,
      status: 'existing',
      targetDate: prepared.run.targetDate,
    }
  }

  try {
    const submitted = await dependencies.submit({
      generationRunId: prepared.run.id,
      policy: HISTORY_SOURCE_POLICY,
      promptVersion: HISTORY_PROMPT_VERSION,
      targetDate,
    })

    await dependencies.markSubmitted(prepared.run.id, submitted.responseId)

    return {
      responseId: submitted.responseId,
      runId: prepared.run.id,
      status: 'submitted',
      targetDate: targetDate.isoDate,
    }
  } catch (error) {
    await dependencies.markFailed(prepared.run.id, getErrorMessage(error))
    throw error
  }
}
