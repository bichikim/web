import {
  getNextKoreanDate,
  HISTORY_PROMPT_VERSION,
  HISTORY_SOURCE_POLICY,
} from 'src/features/history-generation'
import {
  markGenerationFailed,
  markGenerationSubmissionUnknown,
  markGenerationSubmitted,
  prepareGenerationRun,
} from './generation-repository'
import {HistorySubmissionError, submitHistoryResponse} from './openai-client'
import {
  persistGenerationSubmission,
  persistUnknownGenerationSubmission,
} from './submission-persistence'
import {getSubmissionRecoveryDeadline} from './submission-recovery-policy'

const MAX_ERROR_LENGTH = 2000

export interface StartGenerationResult {
  readonly responseId: string | null
  readonly runId: string
  readonly status: 'existing' | 'submitted'
  readonly targetDate: string
}

interface StartGenerationDependencies {
  readonly markFailed: typeof markGenerationFailed
  readonly markUnknown: typeof markGenerationSubmissionUnknown
  readonly markSubmitted: typeof markGenerationSubmitted
  readonly now: () => Date
  readonly prepare: typeof prepareGenerationRun
  readonly submit: typeof submitHistoryResponse
}

const DEFAULT_DEPENDENCIES: StartGenerationDependencies = {
  markFailed: markGenerationFailed,
  markSubmitted: markGenerationSubmitted,
  markUnknown: markGenerationSubmissionUnknown,
  now: () => new Date(),
  prepare: prepareGenerationRun,
  submit: submitHistoryResponse,
}

const getErrorMessage = (error: HistorySubmissionError): string =>
  error.message.slice(0, MAX_ERROR_LENGTH)

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

  let submitted: Awaited<ReturnType<typeof submitHistoryResponse>>

  try {
    submitted = await dependencies.submit({
      generationRunId: prepared.run.id,
      policy: HISTORY_SOURCE_POLICY,
      promptVersion: HISTORY_PROMPT_VERSION,
      submissionKey: prepared.run.openAiSubmissionKey,
      targetDate,
    })
  } catch (error) {
    if (error instanceof HistorySubmissionError) {
      const errorMessage = getErrorMessage(error)

      if (error.acceptance === 'rejected') {
        await dependencies.markFailed(
          prepared.run.id,
          prepared.run.openAiSubmissionKey,
          errorMessage,
        )
      } else {
        const submissionExpiresAt = getSubmissionRecoveryDeadline(dependencies.now())
        await persistUnknownGenerationSubmission({
          errorMessage,
          markUnknown: dependencies.markUnknown,
          runId: prepared.run.id,
          submissionExpiresAt,
          submissionKey: prepared.run.openAiSubmissionKey,
        })
      }
    }

    throw error
  }

  await persistGenerationSubmission(
    prepared.run.id,
    prepared.run.openAiSubmissionKey,
    submitted.responseId,
    dependencies.markSubmitted,
  )

  return {
    responseId: submitted.responseId,
    runId: prepared.run.id,
    status: 'submitted',
    targetDate: targetDate.isoDate,
  }
}
