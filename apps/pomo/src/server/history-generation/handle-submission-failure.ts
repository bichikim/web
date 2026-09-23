import {
  type markGenerationFailed,
  type markGenerationSubmissionUnknown,
} from '../repositories/history-generation'
import {HistorySubmissionError} from './openai-client'
import {getSubmissionRecoveryDeadline} from './submission-recovery-policy'
import {persistUnknownGenerationSubmission} from './submission-persistence'

const MAX_ERROR_LENGTH = 2000

export interface HandleSubmissionFailureOptions {
  readonly error: unknown
  readonly markFailed: typeof markGenerationFailed
  readonly markUnknown: typeof markGenerationSubmissionUnknown
  readonly now: () => Date
  readonly runId: string
  readonly submissionKey: string
}

/** Records a known rejection or an ambiguous submission before its original error propagates. */
export const handleHistorySubmissionFailure = async (
  options: HandleSubmissionFailureOptions,
): Promise<void> => {
  const {error} = options
  if (!(error instanceof HistorySubmissionError)) {
    return
  }
  const errorMessage = error.message.slice(0, MAX_ERROR_LENGTH)
  if (error.acceptance === 'rejected') {
    await options.markFailed(options.runId, options.submissionKey, errorMessage)
    return
  }
  await persistUnknownGenerationSubmission({
    errorMessage,
    markUnknown: options.markUnknown,
    runId: options.runId,
    submissionExpiresAt: getSubmissionRecoveryDeadline(options.now()),
    submissionKey: options.submissionKey,
  })
}
