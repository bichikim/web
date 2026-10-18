import {and, eq, inArray} from 'drizzle-orm'
import {apiAiJobs, getDatabase} from 'src/server/database'
import {
  cancelQueuedApiAiJob,
  findApiAiAttempt,
  findApiAiJob,
  recordApiAiResponse,
} from 'src/server/repositories/api-ai'
import {getApiAiProviders} from 'src/server/api-ai/providers'
import {responsesAdapter} from 'src/server/api-ai/responses-adapter'

/** Requests owned cancellation without releasing an unacknowledged provider submission. */
export const cancelCloudTextJob = async (userId: string, requestId: string): Promise<boolean> => {
  const job = await findApiAiJob(requestId)
  if (job === null || job.ownerId !== userId || job.kind !== 'cloud-text') {
    return false
  }
  const now = new Date()
  const queued = await cancelQueuedApiAiJob(requestId, userId, now)
  if (queued !== null) {
    return true
  }
  const [requested] = await getDatabase()
    .update(apiAiJobs)
    .set({cancelRequestedAt: now})
    .where(
      and(
        eq(apiAiJobs.id, requestId),
        eq(apiAiJobs.ownerId, userId),
        inArray(apiAiJobs.status, ['submitting', 'running', 'recovery_pending']),
      ),
    )
    .returning()
  if (requested?.activeAttemptId !== null && requested?.activeAttemptId !== undefined) {
    const attempt = await findApiAiAttempt(requested.activeAttemptId)
    const provider = getApiAiProviders().find((candidate) => candidate.id === attempt?.providerId)
    if (
      attempt?.responseId !== null &&
      attempt?.responseId !== undefined &&
      provider !== undefined
    ) {
      const {responseId} = attempt
      const response = await responsesAdapter
        .cancel(provider, responseId)
        .catch(() => responsesAdapter.retrieve(provider, responseId))
      await recordApiAiResponse(attempt.id, response, new Date())
    }
  }
  return true
}
