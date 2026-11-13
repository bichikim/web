import {getExceptionMessage} from 'src/features/error-detail'

type SubmissionAcceptance = 'rejected' | 'unknown'

/** Preserves the submission acceptance classification and its original local cause. */
export class HistorySubmissionError extends Error {
  readonly acceptance: SubmissionAcceptance

  constructor(acceptance: SubmissionAcceptance, cause: unknown) {
    const message = getExceptionMessage(cause, 'Unknown OpenAI submission error')

    super(message, {cause})
    this.name = 'HistorySubmissionError'
    this.acceptance = acceptance
  }
}
