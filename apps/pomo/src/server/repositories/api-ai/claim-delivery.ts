import {and, eq, inArray, isNull, lte} from 'drizzle-orm'
import {apiAiJobs, getDatabase} from 'src/server/database'
import {API_AI_POLICY} from 'src/server/api-ai/policy'

/** Reserves one due terminal result and defers its retry if delivery fails or stops. */
export const claimApiAiJobDelivery = async (jobId: string, now: Date): Promise<boolean> => {
  const [claimed] = await getDatabase()
    .update(apiAiJobs)
    .set({nextAttemptAt: new Date(now.getTime() + API_AI_POLICY.recoveryDelayMilliseconds)})
    .where(
      and(
        eq(apiAiJobs.id, jobId),
        inArray(apiAiJobs.status, ['succeeded', 'failed', 'cancelled']),
        isNull(apiAiJobs.deliveredAt),
        lte(apiAiJobs.nextAttemptAt, now),
      ),
    )
    .returning({id: apiAiJobs.id})
  return claimed !== undefined
}
