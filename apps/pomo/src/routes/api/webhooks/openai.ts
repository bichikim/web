import type {APIEvent} from '@solidjs/start/server'
import {assertBodySize, HTTPError} from 'h3'

import type {ApiAiWebhookEvent} from 'src/server/api-ai/types'
import {enqueueApiAiCallback} from 'src/server/repositories/api-ai'
import {completeApiAiJobs} from 'src/server/api-ai/service'
import {waitUntil} from '@vercel/functions'
import {unwrapOpenAiWebhook} from 'src/server/history-generation/openai-client'
import {noStoreEmpty, noStoreJson, noStoreText} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const HTTP_CONTENT_TOO_LARGE = 413
const HTTP_INTERNAL_SERVER_ERROR = 500
const MAXIMUM_BODY_SIZE = 1_048_576
const RESPONSE_EVENTS = new Set([
  'response.cancelled',
  'response.completed',
  'response.failed',
  'response.incomplete',
])

type ResponseEvent = ApiAiWebhookEvent

const isResponseEvent = (event: {readonly type: string}): event is ResponseEvent =>
  RESPONSE_EVENTS.has(event.type)

export const POST = async (event: APIEvent): Promise<Response> => {
  let body: string

  try {
    assertBodySize(event.nativeEvent, MAXIMUM_BODY_SIZE)
    body = await event.nativeEvent.req.text()
  } catch (error) {
    if (HTTPError.isError(error) && error.status === HTTP_CONTENT_TOO_LARGE) {
      return noStoreText('Webhook payload too large', {status: error.status})
    }

    throw error
  }

  let webhook: Awaited<ReturnType<typeof unwrapOpenAiWebhook>>

  try {
    webhook = await unwrapOpenAiWebhook(body, event.request.headers)
  } catch (error) {
    console.error('Rejected invalid OpenAI webhook', error)
    return noStoreText('Invalid webhook signature', {status: HTTP_BAD_REQUEST})
  }

  if (!isResponseEvent(webhook)) {
    return noStoreEmpty()
  }

  try {
    await enqueueApiAiCallback('openai', webhook, new Date())
    waitUntil(completeApiAiJobs())
    return noStoreJson({ok: true})
  } catch (error) {
    console.error('Failed to process OpenAI webhook', error)
    return noStoreText('Webhook processing failed', {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
