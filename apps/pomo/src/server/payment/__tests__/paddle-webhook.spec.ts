import {createHmac} from 'node:crypto'
import {describe, expect, it} from 'vitest'

import {PaddleWebhookError, parsePaddleWebhook} from '../paddle-webhook'

const SECRET = 'notification-secret'
const NOW = new Date('2026-09-23T00:00:00.000Z')
const TIMESTAMP = Math.floor(NOW.getTime() / 1000)
const BODY = JSON.stringify({
  data: {id: 'txn_123'},
  event_id: 'evt_123',
  event_type: 'transaction.completed',
  occurred_at: NOW.toISOString(),
})

const signedHeader = (body: string, timestamp = TIMESTAMP): string =>
  `ts=${timestamp};h1=${createHmac('sha256', SECRET).update(`${timestamp}:${body}`).digest('hex')}`

describe('Paddle webhook signature', () => {
  it('accepts the signed raw body', () => {
    expect(parsePaddleWebhook(BODY, signedHeader(BODY), SECRET, NOW)).toMatchObject({
      data: {id: 'txn_123'},
      id: 'evt_123',
      type: 'transaction.completed',
    })
  })

  it('rejects modified content and stale timestamps', () => {
    expect(() => parsePaddleWebhook(`${BODY} `, signedHeader(BODY), SECRET, NOW)).toThrow(
      PaddleWebhookError,
    )
    expect(() => parsePaddleWebhook(BODY, signedHeader(BODY, TIMESTAMP - 6), SECRET, NOW)).toThrow(
      PaddleWebhookError,
    )
  })
})
