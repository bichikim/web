import type {APIEvent} from '@solidjs/start/server'
import {assertBodySize, HTTPError} from 'h3'
import {waitUntil} from '@vercel/functions'
import {getApiAiProviders} from 'src/server/api-ai/providers'
import {unwrapApiAiWebhook} from 'src/server/api-ai/responses-adapter'
import {completeApiAiJobs} from 'src/server/api-ai/service'
import {enqueueApiAiCallback} from 'src/server/repositories/api-ai'
import {noStoreEmpty, noStoreJson, noStoreText} from 'src/server/http/response'

const HTTP_PAYLOAD_TOO_LARGE = 413
const MAXIMUM_BODY_BYTES = 1_048_576

export const POST = async (event: APIEvent): Promise<Response> => {
  const provider = getApiAiProviders().find((candidate) => candidate.id === event.params.providerId)
  if (provider === undefined) {
    return noStoreText('Not found', {status: 404})
  }
  let body: string
  try {
    assertBodySize(event.nativeEvent, MAXIMUM_BODY_BYTES)
    body = await event.nativeEvent.req.text()
  } catch (error: unknown) {
    if (HTTPError.isError(error) && error.status === HTTP_PAYLOAD_TOO_LARGE) {
      return noStoreText('Webhook payload too large', {status: HTTP_PAYLOAD_TOO_LARGE})
    }
    throw error
  }
  let webhook
  try {
    webhook = await unwrapApiAiWebhook(provider, body, event.request.headers)
  } catch {
    return noStoreText('Invalid webhook signature', {status: 400})
  }
  if (webhook === null) {
    return noStoreEmpty()
  }
  try {
    await enqueueApiAiCallback(provider.id, webhook, new Date())
    waitUntil(completeApiAiJobs())
    return noStoreJson({ok: true})
  } catch (error: unknown) {
    console.error('Failed to persist AI provider callback', {providerId: provider.id}, error)
    return noStoreText('Webhook processing failed', {status: 500})
  }
}
