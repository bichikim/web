import {
  getNextPublicationDate,
  HISTORY_PROMPT_VERSION,
  HISTORY_SOURCE_POLICY,
} from 'src/features/history-generation'
import {
  markGenerationFailed,
  markGenerationSubmissionUnknown,
  markGenerationSubmitted,
  prepareGenerationRun,
} from '../repositories/history-generation'
import {HistorySubmissionError, submitHistoryResponse} from './openai-client'
import {
  persistAcceptedGenerationSubmission,
  persistUnknownGenerationSubmission,
} from './submission-persistence'
import {getSubmissionRecoveryDeadline} from './submission-recovery-policy'
import {withHistoryGenerationLock} from './submission-lock'

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
  readonly withLock?: typeof withHistoryGenerationLock
}

const DEFAULT_DEPENDENCIES: StartGenerationDependencies = {
  markFailed: markGenerationFailed,
  markSubmitted: markGenerationSubmitted,
  markUnknown: markGenerationSubmissionUnknown,
  now: () => new Date(),
  prepare: prepareGenerationRun,
  submit: submitHistoryResponse,
  withLock: withHistoryGenerationLock,
}

const getErrorMessage = (error: HistorySubmissionError): string =>
  error.message.slice(0, MAX_ERROR_LENGTH)

const startHistoryGenerationForDate = async (
  targetDate: ReturnType<typeof getNextPublicationDate>,
  dependencies: StartGenerationDependencies,
): Promise<StartGenerationResult> => {
  const prepared = await dependencies.prepare({
    promptVersion: HISTORY_PROMPT_VERSION,
    sourcePolicyVersion: HISTORY_SOURCE_POLICY.version,
    targetDate,
  })

  const shouldSubmit =
    prepared.created ||
    (prepared.run.status === 'preparing' &&
      prepared.run.openAiResponseId === null &&
      prepared.run.submissionState === null)

  if (!shouldSubmit) {
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

  await persistAcceptedGenerationSubmission({
    markSubmitted: dependencies.markSubmitted,
    markUnknown: dependencies.markUnknown,
    now: dependencies.now,
    responseId: submitted.responseId,
    runId: prepared.run.id,
    submissionKey: prepared.run.openAiSubmissionKey,
  })

  return {
    responseId: submitted.responseId,
    runId: prepared.run.id,
    status: 'submitted',
    targetDate: targetDate.isoDate,
  }
}

/** Creates the next daily run and returns after OpenAI accepts the background response. */
export const startHistoryGeneration = async (
  dependencies: StartGenerationDependencies = DEFAULT_DEPENDENCIES,
): Promise<StartGenerationResult> => {
  const targetDate = getNextPublicationDate(dependencies.now())
  const withLock = dependencies.withLock ?? ((_targetDate, operation) => operation())

  return withLock(targetDate.isoDate, () => startHistoryGenerationForDate(targetDate, dependencies))
}
