import {API_AI_POLICY} from 'src/server/api-ai/policy'
import {and, asc, eq, isNull, lte} from 'drizzle-orm'
import {apiAiCallbacks, getDatabase} from 'src/server/database'
import type {ApiAiCallback, ApiAiWebhookEvent} from 'src/server/api-ai/types'
import {apiAiCallbackSelection} from './selections'

/** Durably accepts a verified callback, deduplicated within its provider. */
export const enqueueApiAiCallback = async (
  providerId: string,
  event: ApiAiWebhookEvent,
  now: Date,
): Promise<void> => {
  await getDatabase()
    .insert(apiAiCallbacks)
    .values({
      eventId: event.id,
      eventType: event.type,
      nextAttemptAt: now,
      providerId,
      receivedAt: now,
      responseId: event.data.id,
    })
    .onConflictDoNothing()
}

export const listPendingApiAiCallbacks = (now: Date): Promise<ReadonlyArray<ApiAiCallback>> =>
  getDatabase()
    .select(apiAiCallbackSelection)
    .from(apiAiCallbacks)
    .where(and(isNull(apiAiCallbacks.processedAt), lte(apiAiCallbacks.nextAttemptAt, now)))
    .orderBy(
      asc(apiAiCallbacks.nextAttemptAt),
      asc(apiAiCallbacks.receivedAt),
      asc(apiAiCallbacks.id),
    )
    .limit(API_AI_POLICY.maximumBatch)

export const markApiAiCallbackProcessed = async (callbackId: string, now: Date): Promise<void> => {
  await getDatabase()
    .update(apiAiCallbacks)
    .set({processedAt: now})
    .where(eq(apiAiCallbacks.id, callbackId))
}
