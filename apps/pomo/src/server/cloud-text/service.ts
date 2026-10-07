// oxlint-disable eslint-js/camelcase -- OpenAI request fields follow its API contract.
import {createHash} from 'node:crypto'
import {
  CLOUD_TEXT_MODEL,
  type CloudTextRequest,
  type CloudTextUsage,
} from 'src/features/cloud-text/contracts'
import {getOpenAiClient} from '../history-generation/openai-client'
import {completeCloudText, readCloudTextUsage, releaseCloudText, reserveCloudText} from './quota'

const GENERATION_TIMEOUT_MILLISECONDS = 120_000

export type CloudTextResult =
  | {
      readonly kind: 'complete'
      readonly text: string
      readonly tokenCount: number
      readonly usage: CloudTextUsage
    }
  | {readonly kind: 'conflict' | 'pending' | 'failed' | 'exhausted'; readonly usage: CloudTextUsage}

/** Generates text through the existing OpenAI client under the daily account allowance. */
export const generateCloudText = async (
  userId: string,
  request: CloudTextRequest,
): Promise<CloudTextResult> => {
  const requestHash = createHash('sha256')
    .update(JSON.stringify({maximumTokens: request.maximumTokens, messages: request.messages}))
    .digest('hex')
  const reservation = await reserveCloudText({
    now: new Date(),
    requestHash,
    requestId: request.requestId,
    userId,
  })
  if (reservation.kind === 'existing') {
    return {...reservation, kind: 'complete'}
  }
  if (reservation.kind !== 'reserved') {
    return reservation
  }
  try {
    const response = await getOpenAiClient().responses.create(
      {
        input: request.messages.map((message) => ({content: message.content, role: message.role})),
        max_output_tokens: request.maximumTokens,
        model: CLOUD_TEXT_MODEL,
        reasoning: {effort: 'none'},
        store: false,
      },
      {idempotencyKey: request.requestId, maxRetries: 0, timeout: GENERATION_TIMEOUT_MILLISECONDS},
    )
    const text = response.output_text.trim()
    if (
      response.status !== 'completed' ||
      text.length === 0 ||
      response.usage === null ||
      response.usage === undefined
    ) {
      throw new Error('OpenAI did not complete the cloud text request')
    }
    const tokenCount = response.usage.total_tokens
    await completeCloudText({requestId: request.requestId, text, tokenCount, userId})
    const usage = await readCloudTextUsage(userId).catch((error: unknown) => {
      console.error('Failed to refresh cloud text usage after completion', error)
      return reservation.usage
    })
    return {kind: 'complete', text, tokenCount, usage}
  } catch (error: unknown) {
    await releaseCloudText(userId, request.requestId)
    throw error
  }
}
