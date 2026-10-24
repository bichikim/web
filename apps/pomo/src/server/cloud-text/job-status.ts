import {and, eq} from 'drizzle-orm'
import {cloudTextRequests, getDatabase} from 'src/server/database'
import {findApiAiJob} from 'src/server/repositories/api-ai'
import {readCloudTextUsage} from './quota'

/** Reads an owned generation without resubmitting its provider request. */
export const readCloudTextJob = async (userId: string, requestId: string) => {
  const [request] = await getDatabase()
    .select()
    .from(cloudTextRequests)
    .where(and(eq(cloudTextRequests.id, requestId), eq(cloudTextRequests.userId, userId)))
    .limit(1)
  if (request === undefined) {
    return null
  }
  const usage = await readCloudTextUsage(userId)
  const job = await findApiAiJob(requestId)
  if (request.status === 'complete' && request.result !== null) {
    return {
      kind: 'complete' as const,
      modelId: job?.ownerId === userId ? (job.result?.model ?? null) : null,
      text: request.result,
      tokenCount: request.tokenCount,
      usage,
    }
  }
  if (job === null || job.ownerId !== userId) {
    return {kind: 'failed' as const, requestId, usage}
  }
  if (request.status === 'failed' || request.status === 'cancelled') {
    return {
      kind: job.status === 'cancelled' ? ('cancelled' as const) : ('failed' as const),
      requestId,
      usage,
    }
  }
  switch (job.status) {
    case 'succeeded':
    case 'cancelled':
    case 'failed':
      // 결과와 사용 횟수의 정산이 반영될 때까지 구독을 유지한다.
      return {kind: 'pending' as const, requestId, status: 'running' as const, usage}
    case 'queued':
    case 'running':
    case 'submitting':
    case 'recovery_pending':
      return {kind: 'pending' as const, requestId, status: job.status, usage}
    default: {
      const unhandled: never = job.status
      throw new TypeError(`Unknown AI job status: ${unhandled}`)
    }
  }
}
