/** @vitest-environment node */
import {createHmac} from 'node:crypto'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const envMocks = vi.hoisted(() => ({
  env: {PADDLE_WEBHOOK_SECRET: 'notification-secret' as string | undefined},
}))
const paymentMocks = vi.hoisted(() => ({processPaddleWebhookEvent: vi.fn()}))

vi.mock('src/env', () => envMocks)
vi.mock('src/server/payment', () => paymentMocks)

import {invokeApiRoute} from '../../../__tests__/invoke'
import {POST} from '../webhook'

const TIMESTAMP = Math.floor(Date.now() / 1000)
const PAYLOAD = JSON.stringify({
  data: {id: 'txn_123'},
  event_id: 'evt_123',
  event_type: 'transaction.completed',
  occurred_at: new Date().toISOString(),
})

const createSignature = (payload: string): string =>
  `ts=${TIMESTAMP};h1=${createHmac('sha256', 'notification-secret').update(`${TIMESTAMP}:${payload}`).digest('hex')}`

const createRequest = (payload = PAYLOAD, signature = createSignature(payload)): Request =>
  new Request('https://pomo.example/api/payments/paddle/webhook', {
    body: payload,
    headers: {'Content-Type': 'application/json', 'Paddle-Signature': signature},
    method: 'POST',
  })

beforeEach(() => {
  vi.clearAllMocks()
  envMocks.env.PADDLE_WEBHOOK_SECRET = 'notification-secret'
  paymentMocks.processPaddleWebhookEvent.mockResolvedValue('processed')
})

describe('Paddle webhook route', () => {
  it('verifies the raw body before delivering the event', async () => {
    const response = await invokeApiRoute(POST, createRequest())
    expect(response.status).toBe(200)
    expect(paymentMocks.processPaddleWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({id: 'evt_123', type: 'transaction.completed'}),
    )
  })

  it('rejects a signature mismatch before writing the event', async () => {
    const response = await invokeApiRoute(POST, createRequest(PAYLOAD, 'ts=1;h1=invalid'))
    expect(response.status).toBe(400)
    expect(paymentMocks.processPaddleWebhookEvent).not.toHaveBeenCalled()
  })

  it('returns 503 if the notification secret is missing', async () => {
    envMocks.env.PADDLE_WEBHOOK_SECRET = undefined
    const response = await invokeApiRoute(POST, createRequest())
    expect(response.status).toBe(503)
  })
})
