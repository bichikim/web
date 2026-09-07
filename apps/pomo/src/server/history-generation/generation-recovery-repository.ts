import {and, asc, eq, isNull, lt, lte, or} from 'drizzle-orm'

import {type Database, getDatabase, historicalGenerationRuns} from '../database'

const MAX_RECOVERY_RUNS = 10

interface RecoverableResponseRun {
  readonly kind: 'response'
  readonly responseId: string
}

interface RecoverableUnknownSubmissionRun {
  readonly kind: 'submission_unknown'
  readonly runId: string
}

export type RecoverableGenerationRun = RecoverableResponseRun | RecoverableUnknownSubmissionRun

export interface SubmissionExpirationCutoffs {
  readonly preparingBefore: Date
  readonly submissionExpiredBefore: Date
}

export interface RecoveryCutoffs extends SubmissionExpirationCutoffs {
  readonly submittedBefore: Date
}

/** Terminates an ambiguous submission only after its stored recovery deadline. */
export const expireGenerationSubmission = async (
  runId: string,
  cutoffs: SubmissionExpirationCutoffs,
  database: Database = getDatabase(),
): Promise<boolean> => {
  const [expired] = await database
    .update(historicalGenerationRuns)
    .set({submissionState: 'expired', updatedAt: new Date()})
    .where(
      and(
        eq(historicalGenerationRuns.id, runId),
        eq(historicalGenerationRuns.status, 'preparing'),
        isNull(historicalGenerationRuns.openAiResponseId),
        or(
          and(
            eq(historicalGenerationRuns.submissionState, 'unknown'),
            lte(historicalGenerationRuns.submissionExpiresAt, cutoffs.submissionExpiredBefore),
          ),
          and(
            isNull(historicalGenerationRuns.submissionState),
            lt(historicalGenerationRuns.updatedAt, cutoffs.preparingBefore),
          ),
        ),
      ),
    )
    .returning({id: historicalGenerationRuns.id})

  return expired !== undefined
}

/** Lists submitted responses and expired ambiguous submissions that need recovery. */
export const listRecoverableGenerationRuns = async (
  cutoffs: RecoveryCutoffs,
  database: Database = getDatabase(),
): Promise<ReadonlyArray<RecoverableGenerationRun>> => {
  const runs = await database
    .select({
      id: historicalGenerationRuns.id,
      responseId: historicalGenerationRuns.openAiResponseId,
      status: historicalGenerationRuns.status,
      submissionState: historicalGenerationRuns.submissionState,
    })
    .from(historicalGenerationRuns)
    .where(
      or(
        and(
          eq(historicalGenerationRuns.status, 'submitted'),
          lt(historicalGenerationRuns.updatedAt, cutoffs.submittedBefore),
        ),
        and(
          eq(historicalGenerationRuns.status, 'preparing'),
          isNull(historicalGenerationRuns.openAiResponseId),
          or(
            and(
              eq(historicalGenerationRuns.submissionState, 'unknown'),
              lte(historicalGenerationRuns.submissionExpiresAt, cutoffs.submissionExpiredBefore),
            ),
            and(
              isNull(historicalGenerationRuns.submissionState),
              lt(historicalGenerationRuns.updatedAt, cutoffs.preparingBefore),
            ),
          ),
        ),
      ),
    )
    .orderBy(
      asc(historicalGenerationRuns.status),
      asc(historicalGenerationRuns.submissionState),
      asc(historicalGenerationRuns.submissionExpiresAt),
      asc(historicalGenerationRuns.updatedAt),
    )
    .limit(MAX_RECOVERY_RUNS)

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
