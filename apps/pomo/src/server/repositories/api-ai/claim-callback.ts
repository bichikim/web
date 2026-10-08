import {and, eq, isNull, lte} from 'drizzle-orm'
import {apiAiCallbacks, getDatabase} from 'src/server/database'
import {API_AI_POLICY} from 'src/server/api-ai/policy'

/** Reserves one due callback and defers its retry if processing fails or stops. */
export const claimApiAiCallback = async (callbackId: string, now: Date): Promise<boolean> => {
  const [claimed] = await getDatabase()
    .update(apiAiCallbacks)
    .set({nextAttemptAt: new Date(now.getTime() + API_AI_POLICY.recoveryDelayMilliseconds)})
    .where(
      and(
        eq(apiAiCallbacks.id, callbackId),
        isNull(apiAiCallbacks.processedAt),
        lte(apiAiCallbacks.nextAttemptAt, now),
      ),
    )
    .returning({id: apiAiCallbacks.id})
  return claimed !== undefined
}
