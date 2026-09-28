import {createHmac, timingSafeEqual} from 'node:crypto'

const SIGNATURE_TOLERANCE_SECONDS = 5
const SIGNATURE_VALUE_PREFIX_LENGTH = 3
const MILLISECONDS_PER_SECOND = 1000

type RecordValue = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export interface PaddleWebhookEvent {
  readonly data: RecordValue
  readonly id: string
  readonly occurredAt: string
  readonly payload: RecordValue
  readonly type: string
}

export class PaddleWebhookError extends Error {
  readonly code: 'invalid_payload' | 'invalid_signature' | 'stale_signature'

  constructor(code: PaddleWebhookError['code']) {
    super(`Paddle webhook: ${code}`)
    this.name = 'PaddleWebhookError'
    this.code = code
  }
}

const parseSignature = (
  header: string,
): {readonly timestamp: number; readonly hashes: string[]} => {
  const parts = header.split(';').map((part) => part.trim())
  const timestampPart = parts.find((part) => part.startsWith('ts='))
  const hashes = parts
    .filter((part) => part.startsWith('h1='))
    .map((part) => part.slice(SIGNATURE_VALUE_PREFIX_LENGTH))
    .filter((hash) => /^[0-9a-f]{64}$/u.test(hash))
  const timestamp = Number(timestampPart?.slice(SIGNATURE_VALUE_PREFIX_LENGTH))

  if (timestampPart === undefined || !Number.isSafeInteger(timestamp) || hashes.length === 0) {
    throw new PaddleWebhookError('invalid_signature')
  }

  return {hashes, timestamp}
}

export const parsePaddleWebhookPayload = (value: unknown): PaddleWebhookEvent => {
  if (
    !isRecord(value) ||
    typeof value.event_id !== 'string' ||
    !value.event_id.startsWith('evt_') ||
    typeof value.event_type !== 'string' ||
    typeof value.occurred_at !== 'string' ||
    !isRecord(value.data)
  ) {
    throw new PaddleWebhookError('invalid_payload')
  }

  return {
    data: value.data,
    id: value.event_id,
    occurredAt: value.occurred_at,
    payload: value,
    type: value.event_type,
  }
}

export const parsePaddleWebhook = (
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  now: Date = new Date(),
): PaddleWebhookEvent => {
  if (signatureHeader === null || secret.length === 0) {
    throw new PaddleWebhookError('invalid_signature')
  }

  const {hashes, timestamp} = parseSignature(signatureHeader)
  if (
    Math.abs(Math.floor(now.getTime() / MILLISECONDS_PER_SECOND) - timestamp) >
    SIGNATURE_TOLERANCE_SECONDS
  ) {
    throw new PaddleWebhookError('stale_signature')
  }

  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${timestamp}:${rawBody}`).digest('hex'),
    'hex',
  )
  const matches = hashes.some((hash) => {
    const actual = Buffer.from(hash, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  })

  if (!matches) {
    throw new PaddleWebhookError('invalid_signature')
  }

  let value: unknown
  try {
    value = JSON.parse(rawBody)
  } catch {
    throw new PaddleWebhookError('invalid_payload')
  }

  return parsePaddleWebhookPayload(value)
}
