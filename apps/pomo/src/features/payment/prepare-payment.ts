import {apiFetch} from '../http-client'
import {
  isPaymentProvider,
  type PaymentProvider,
  type PaymentRejected,
  type PreparedPayment,
  type PreparePaymentRequest,
} from './types'

export type PaymentStartResult = PreparedPayment | PaymentRejected

const PAYMENT_REJECTION_CODES = [
  'already_owned',
  'login_required',
  'price_changed',
  'provider_unavailable',
  'unavailable',
] as const

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const isPaymentRejected = (value: unknown): value is PaymentRejected =>
  isRecord(value) &&
  value.status === 'rejected' &&
  typeof value.code === 'string' &&
  PAYMENT_REJECTION_CODES.includes(value.code as (typeof PAYMENT_REJECTION_CODES)[number])

const isPaymentDetails = (value: Readonly<Record<string, unknown>>): boolean =>
  typeof value.amountMinor === 'string' &&
  /^(?:0|[1-9]\d*)$/u.test(value.amountMinor) &&
  typeof value.currency === 'string' &&
  /^[A-Z]{3}$/u.test(value.currency) &&
  typeof value.expiresAt === 'string' &&
  typeof value.orderId === 'string' &&
  typeof value.productId === 'string'

const isPreparedPayment = (value: unknown): value is PreparedPayment => {
  if (!isRecord(value) || !isPaymentDetails(value) || !isPaymentProvider(value.provider)) {
    return false
  }

  switch (value.provider) {
    case 'apps-in-toss':
      return typeof value.sku === 'string'
    case 'paddle':
      return typeof value.checkoutUrl === 'string'
  }
}

const parsePaymentStartResult = (value: unknown): PaymentStartResult => {
  if (isPreparedPayment(value) || isPaymentRejected(value)) {
    return value
  }

  throw new TypeError('Payment start response has an invalid format')
}

export const preparePayment = async (
  request: PreparePaymentRequest,
): Promise<PaymentStartResult> => {
  const response = await apiFetch('payments/start', {
    body: JSON.stringify(request),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
    retry: false,
  })
  const body: unknown = await response.json()

  if (!response.ok && !isPaymentRejected(body)) {
    throw new Error(`Payment start request failed: ${response.status}`)
  }

  return parsePaymentStartResult(body)
}

export type {PaymentProvider}
