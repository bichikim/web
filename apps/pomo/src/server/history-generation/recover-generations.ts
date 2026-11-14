import {sumBy} from 'es-toolkit/math'

import {
  expireGenerationSubmission,
  listRecoverableGenerationRuns,
  type RecoverableGenerationRun,
  type RecoveryCutoffs,
} from '../repositories/history-generation-recovery'
import {handleOpenAiResponseEvent} from './handle-openai-webhook'
import {retrieveHistoryResponse} from './response-result'
import {startHistoryGeneration} from './start-generation'
import {
  SUBMITTED_RESPONSE_RECOVERY_DELAY_MILLISECONDS,
  UNKNOWN_SUBMISSION_EXPIRATION_MILLISECONDS,
} from './submission-recovery-policy'

export interface RecoveryResult {
  readonly checked: number
  readonly failed: number
  readonly terminal: number
}

type RecoveryRunResult = 'failed' | 'pending' | 'terminal'

const recoverGenerationRun = async (
  run: RecoverableGenerationRun,
  cutoffs: RecoveryCutoffs,
): Promise<RecoveryRunResult> => {
  if (run.kind === 'submission_unknown') {
    try {
      return (await expireGenerationSubmission(run.runId, cutoffs)) ? 'terminal' : 'pending'
    } catch (error) {
      console.error('Failed to expire ambiguous OpenAI submission', {runId: run.runId}, error)
      return 'failed'
    }
  }

  try {
    const response = await retrieveHistoryResponse(run.responseId)
    const observedStatus = response.status

    switch (observedStatus) {
      case 'cancelled':
      case 'completed':
      case 'failed':
      case 'incomplete':
        await handleOpenAiResponseEvent({
          data: {id: run.responseId},
          id: `recovery:${run.responseId}`,
          type: `response.${observedStatus}`,
        })
        return 'terminal'
      case 'in_progress':
      case 'queued':
      case undefined:
        return 'pending'
      default: {
        const _unhandledStatus: never = observedStatus
        throw new Error(`Unhandled OpenAI response status: ${response.status}`)
      }
    }
  } catch (error) {
    console.error('Failed to recover OpenAI response', {responseId: run.responseId}, error)
    return 'failed'
  }
}

/** Replays terminal responses when their OpenAI webhook was not received. */
export const recoverHistoryGenerations = async (now = new Date()): Promise<RecoveryResult> => {
  const preparingBefore = new Date(now.getTime() - UNKNOWN_SUBMISSION_EXPIRATION_MILLISECONDS)
  const submittedBefore = new Date(now.getTime() - SUBMITTED_RESPONSE_RECOVERY_DELAY_MILLISECONDS)
  const cutoffs = {
    preparingBefore,
    submissionExpiredBefore: now,
    submittedBefore,
  } satisfies RecoveryCutoffs
  const runs = await listRecoverableGenerationRuns(cutoffs)
  const results = await Promise.all(runs.map((run) => recoverGenerationRun(run, cutoffs)))
  const failed = sumBy(results, (result) => (result === 'failed' ? 1 : 0))
  const terminal = sumBy(results, (result) => (result === 'terminal' ? 1 : 0))

  // Continue daily generation after polling stale work; ambiguous expirations stay terminal.
  await startHistoryGeneration()

  return {checked: runs.length, failed, terminal}
}
