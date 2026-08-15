import type {APIEvent} from '@solidjs/start/server'

import {handleOpenAiResponseEvent} from 'src/server/history-generation/handle-openai-webhook'
import {unwrapOpenAiWebhook} from 'src/server/history-generation/openai-client'

const RESPONSE_EVENTS = new Set([
  'response.cancelled',
  'response.completed',
  'response.failed',
  'response.incomplete',
])

type ResponseEvent = Parameters<typeof handleOpenAiResponseEvent>[0]

const isResponseEvent = (event: {readonly type: string}): event is ResponseEvent =>
  RESPONSE_EVENTS.has(event.type)

export const POST = async (event: APIEvent): Promise<Response> => {
  const body = await event.request.text()

  let webhook: Awaited<ReturnType<typeof unwrapOpenAiWebhook>>

  try {
    webhook = await unwrapOpenAiWebhook(body, event.request.headers)
  } catch (error) {
    console.error('Rejected invalid OpenAI webhook', error)
    return new Response('Invalid webhook signature', {status: 400})
  }

  if (!isResponseEvent(webhook)) {
    return new Response(null, {status: 204})
  }

  try {
    await handleOpenAiResponseEvent(webhook)
    return Response.json({ok: true})
  } catch (error) {
    console.error('Failed to process OpenAI webhook', error)
    return new Response('Webhook processing failed', {status: 500})
  }
}
