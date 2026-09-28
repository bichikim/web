import type {APIEvent} from '@solidjs/start/server'

import {env} from 'src/env'
import {readBoundedRequest} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {type PaddleWebhookProcessingResult, processPaddleWebhookEvent} from 'src/server/payment'
import {PaddleWebhookError, parsePaddleWebhook} from 'src/server/payment/paddle-webhook'

const HTTP_BAD_REQUEST = 400
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_TOO_LARGE = 413
const MAXIMUM_WEBHOOK_BODY_SIZE = 262_144

const isProcessingResult = (value: string): value is PaddleWebhookProcessingResult =>
  value === 'duplicate' || value === 'processed' || value === 'rejected'

export const POST = async (event: APIEvent): Promise<Response> => {
  if (env.PADDLE_WEBHOOK_SECRET === undefined) {
    return noStoreJson({error: 'payment_webhook_unavailable'}, {status: HTTP_SERVICE_UNAVAILABLE})
  }

  const bounded = await readBoundedRequest(event, MAXIMUM_WEBHOOK_BODY_SIZE)
  if (!bounded.success) {
    return noStoreJson(
      {error: bounded.status === HTTP_TOO_LARGE ? 'payload_too_large' : 'invalid_request'},
      {status: bounded.status},
    )
  }

  const signature = event.request.headers.get('paddle-signature')
  const payload = await bounded.request.text()
  let webhook
  try {
    webhook = parsePaddleWebhook(payload, signature, env.PADDLE_WEBHOOK_SECRET)
  } catch (error: unknown) {
    if (!(error instanceof PaddleWebhookError)) {
      throw error
    }

    return noStoreJson({error: 'invalid_webhook'}, {status: HTTP_BAD_REQUEST})
  }

  try {
    const result = await processPaddleWebhookEvent(webhook)
    if (!isProcessingResult(result)) {
      throw new TypeError('Paddle webhook processing returned an invalid result')
    }

    return noStoreJson({ok: true, status: result})
  } catch (error: unknown) {
    console.error('Failed to process Paddle webhook', error)
    return noStoreJson({error: 'webhook_processing_failed'}, {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
