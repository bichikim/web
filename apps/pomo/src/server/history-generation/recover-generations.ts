import {
  expireGenerationSubmission,
  listRecoverableGenerationRuns,
  type RecoverableGenerationRun,
  type RecoveryCutoffs,
} from './generation-recovery-repository'
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
    let eventType:
      | 'response.cancelled'
      | 'response.completed'
      | 'response.failed'
      | 'response.incomplete'
      | undefined

    switch (response.status) {
      case 'cancelled':
        eventType = 'response.cancelled'
        break
      case 'completed':
        eventType = 'response.completed'
        break
      case 'failed':
        eventType = 'response.failed'
        break
      case 'incomplete':
        eventType = 'response.incomplete'
        break
      case 'in_progress':
      case 'queued':
      case undefined:
        eventType = undefined
        break
      default: {
        const unhandledStatus: never = response.status
        throw new Error(`Unhandled OpenAI response status: ${unhandledStatus}`)
      }
    }

    if (eventType === undefined) {
      return 'pending'
    }

    await handleOpenAiResponseEvent({
      data: {id: run.responseId},
      id: `recovery:${run.responseId}`,
      type: eventType,
    })

    return 'terminal'
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
  const failed = results.filter((result) => result === 'failed').length
  const terminal = results.filter((result) => result === 'terminal').length

  // Continue daily generation after polling stale work; ambiguous expirations stay terminal.
  await startHistoryGeneration()

  return {checked: runs.length, failed, terminal}
}
