import type {historicalGenerationRuns} from '../../database'

type StoredGenerationRun = typeof historicalGenerationRuns.$inferSelect

interface RecoveryRunSnapshot {
  readonly id: StoredGenerationRun['id']
  readonly responseId: StoredGenerationRun['openAiResponseId']
  readonly status: StoredGenerationRun['status']
  readonly submissionState: StoredGenerationRun['submissionState']
}

interface RecoverableResponseRun {
  readonly kind: 'response'
  readonly responseId: string
}

interface RecoverableUnknownSubmissionRun {
  readonly kind: 'submission_unknown'
  readonly runId: string
}

export type RecoverableGenerationRun = RecoverableResponseRun | RecoverableUnknownSubmissionRun

export const classifyRuns = (
  runs: ReadonlyArray<RecoveryRunSnapshot>,
): ReadonlyArray<RecoverableGenerationRun> => {
  const recoverableRuns: RecoverableGenerationRun[] = []

  for (const run of runs) {
    switch (run.status) {
      case 'submitted':
        if (run.responseId !== null) {
          recoverableRuns.push({kind: 'response', responseId: run.responseId})
        }
        break
      case 'preparing':
        switch (run.submissionState) {
          case null:
          case 'unknown':
            recoverableRuns.push({kind: 'submission_unknown', runId: run.id})
            break
          case 'expired':
            break
          default: {
            const unhandledState: never = run.submissionState
            throw new Error(`Unhandled submission state: ${unhandledState}`)
          }
        }
        break
      case 'completed':
      case 'failed':
      case 'rejected':
        break
      default: {
        const unhandledStatus: never = run.status
        throw new Error(`Unhandled generation status: ${unhandledStatus}`)
      }
    }
  }

  return recoverableRuns
}
