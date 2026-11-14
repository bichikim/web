import {and, asc, eq, isNull, lt, lte, or} from 'drizzle-orm'

import {type Database, getDatabase, historicalGenerationRuns} from '../../database'
import {classifyRuns, type RecoverableGenerationRun} from './classify-runs'

export {classifyRuns, type RecoverableGenerationRun}

const MAX_RECOVERY_RUNS = 10

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

  return classifyRuns(runs)
}
