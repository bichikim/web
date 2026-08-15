import {listRecoverableGenerationRuns} from './generation-repository'
import {handleOpenAiResponseEvent} from './handle-openai-webhook'
import {retrieveHistoryResponse} from './response-result'
import {startHistoryGeneration} from './start-generation'

const MINUTES_PER_RECOVERY_DELAY = 30
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
const RECOVERY_DELAY_MILLISECONDS =
  MINUTES_PER_RECOVERY_DELAY * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface RecoveryResult {
  readonly checked: number
  readonly terminal: number
}

/** Replays terminal responses when their OpenAI webhook was not received. */
export const recoverHistoryGenerations = async (): Promise<RecoveryResult> => {
  const updatedBefore = new Date(Date.now() - RECOVERY_DELAY_MILLISECONDS)
  const runs = await listRecoverableGenerationRuns(updatedBefore)
  const results = await Promise.all(
    runs.map(async (run): Promise<boolean> => {
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
        return false
      }

      await handleOpenAiResponseEvent({
        data: {id: run.responseId},
        id: `recovery:${run.responseId}`,
        type: eventType,
      })

      return true
    }),
  )
  const terminal = results.filter(Boolean).length

  // Retry one failed submission or terminal response after polling stale work.
  await startHistoryGeneration()

  return {checked: runs.length, terminal}
}
