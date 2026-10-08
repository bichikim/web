import {API_AI_POLICY} from 'src/server/api-ai/policy'
// oxlint-disable eslint-js/camelcase -- Stored Responses input retains its wire contract.
import {createHash} from 'node:crypto'
import {env} from 'src/env'
import {
  CLOUD_TEXT_MODEL,
  type CloudTextRequest,
  type CloudTextUsage,
} from 'src/features/cloud-text/contracts'
import {getApiAiProviders} from 'src/server/api-ai/providers'
import {findApiAiJob} from 'src/server/repositories/api-ai'
import {reserveCloudText} from './quota'

export type CloudTextResult =
  | {
      readonly kind: 'complete'
      readonly text: string
      readonly tokenCount: number
      readonly usage: CloudTextUsage
    }
  | {readonly kind: 'accepted'; readonly requestId: string; readonly usage: CloudTextUsage}
  | {
      readonly kind: 'conflict' | 'failed' | 'exhausted' | 'queue_full'
      readonly usage: CloudTextUsage
    }

/** Reserves one daily use and a durable job before any provider submission. */
export const generateCloudText = async (
  userId: string,
  request: CloudTextRequest,
): Promise<CloudTextResult> => {
  if (env.DATABASE_URL_UNPOOLED === undefined) {
    throw new TypeError('DATABASE_URL_UNPOOLED is required for cloud text result notifications')
  }
  getApiAiProviders()
  const now = new Date()
  const requestHash = createHash('sha256')
    .update(JSON.stringify({maximumTokens: request.maximumTokens, messages: request.messages}))
    .digest('hex')
  const reservation = await reserveCloudText({
    now,
    queue: {
      input: {
        body: {
          input: request.messages.map((message) => ({
            content: message.content,
            role: message.role,
          })),
          max_output_tokens: request.maximumTokens,
          model: CLOUD_TEXT_MODEL,
          reasoning: {effort: 'none'},
        },
        generationMilliseconds: API_AI_POLICY.cloudGenerationMilliseconds,
        id: request.requestId,
        kind: 'cloud-text',
        ownerId: userId,
        queueExpiresAt: new Date(now.getTime() + API_AI_POLICY.queueMilliseconds),
        requestHash,
      },
      limit: env.POMO_AI_QUEUE_LIMIT,
    },
    requestHash,
    requestId: request.requestId,
    userId,
  })
  switch (reservation.kind) {
    case 'existing':
      return {...reservation, kind: 'complete'}
    case 'conflict':
    case 'failed':
    case 'exhausted':
    case 'queue_full':
      return {kind: reservation.kind, usage: reservation.usage}
    case 'reserved':
    case 'pending': {
      const job = await findApiAiJob(request.requestId)
      if (job === null || job.ownerId !== userId) {
        return {kind: 'failed', usage: reservation.usage}
      }
      return {kind: 'accepted', requestId: request.requestId, usage: reservation.usage}
    }
  }
}
