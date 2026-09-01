import {
  HISTORY_PROMPT_VERSION,
  HISTORY_SOURCE_POLICY,
  type HistoryTargetDate,
} from 'src/features/history-generation'
import {
  markGenerationFailed,
  markGenerationSubmissionUnknown,
  markGenerationSubmitted,
  prepareGenerationRerun,
} from './generation-repository'
import {HistorySubmissionError, submitHistoryResponse} from './openai-client'
import {
  persistGenerationSubmission,
  persistUnknownGenerationSubmission,
} from './submission-persistence'
import {getSubmissionRecoveryDeadline} from './submission-recovery-policy'

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
  readonly markUnknown: typeof markGenerationSubmissionUnknown
  readonly markSubmitted: typeof markGenerationSubmitted
  readonly now: () => Date
  readonly prepare: typeof prepareGenerationRerun
  readonly submit: typeof submitHistoryResponse
}

const DEFAULT_DEPENDENCIES: StartRegenerationDependencies = {
  markFailed: markGenerationFailed,
  markSubmitted: markGenerationSubmitted,
  markUnknown: markGenerationSubmissionUnknown,
  now: () => new Date(),
  prepare: prepareGenerationRerun,
  submit: submitHistoryResponse,
}

const getErrorMessage = (error: HistorySubmissionError): string =>
  error.message.slice(0, MAX_ERROR_LENGTH)

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
      policy: HISTORY_SOURCE_POLICY,
      promptVersion: HISTORY_PROMPT_VERSION,
      requiredTitles: options.requiredTitles,
      submissionKey: run.openAiSubmissionKey,
      targetDate: options.targetDate,
    })
  } catch (error) {
    if (error instanceof HistorySubmissionError) {
      const errorMessage = getErrorMessage(error)

      if (error.acceptance === 'rejected') {
        await dependencies.markFailed(run.id, run.openAiSubmissionKey, errorMessage)
      } else {
        await persistUnknownGenerationSubmission({
          errorMessage,
          markUnknown: dependencies.markUnknown,
          runId: run.id,
          submissionExpiresAt: getSubmissionRecoveryDeadline(dependencies.now()),
          submissionKey: run.openAiSubmissionKey,
        })
      }
    }

    throw error
  }

  await persistGenerationSubmission(
    run.id,
    run.openAiSubmissionKey,
    submitted.responseId,
    dependencies.markSubmitted,
  )

  return {
    responseId: submitted.responseId,
    runId: run.id,
    status: 'submitted',
    targetDate: options.targetDate.isoDate,
  }
}
