import {apiFetch} from '../http-client'

const HTTP_UNAUTHORIZED = 401
const MAXIMUM_FRACTIONAL_DIGITS = 6
const MINOR_UNIT_BASE = 10

export const PAYMENT_ORDER_STATUSES = [
  'canceled',
  'failed',
  'paid',
  'partially_refunded',
  'pending',
  'refunded',
] as const
export type PaymentOrderStatus = (typeof PAYMENT_ORDER_STATUSES)[number]

export const PAYMENT_ENTITLEMENT_STATUSES = ['granted', 'missing', 'revoked'] as const
export type PaymentEntitlementStatus = (typeof PAYMENT_ENTITLEMENT_STATUSES)[number]

export interface PaymentOrderStatusView {
  readonly amountMinor: string
  readonly currency: string
  readonly entitlementStatus: PaymentEntitlementStatus
  readonly orderId: string
  readonly productId: string
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly status: PaymentOrderStatus
}

export interface PaymentOrderHistoryView extends PaymentOrderStatusView {
  readonly createdAt: string
  readonly fractionalDigits: number
  readonly paidAt: string | null
  readonly receiptUrl: string | null
  readonly refundedAt: string | null
}

export class PaymentAuthenticationRequiredError extends Error {
  constructor() {
    super('Payment authentication is required')
    this.name = 'PaymentAuthenticationRequiredError'
  }
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null

const isPaymentOrderStatus = (value: unknown): value is PaymentOrderStatus =>
  typeof value === 'string' && PAYMENT_ORDER_STATUSES.includes(value as PaymentOrderStatus)

const isPaymentEntitlementStatus = (value: unknown): value is PaymentEntitlementStatus =>
  typeof value === 'string' &&
  PAYMENT_ENTITLEMENT_STATUSES.includes(value as PaymentEntitlementStatus)

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

interface PaymentOrderPayload extends Readonly<Record<string, unknown>> {
  readonly amountMinor: string
  readonly currency: string
  readonly entitlementStatus: PaymentEntitlementStatus
  readonly orderId: string
  readonly productId: string
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly status: PaymentOrderStatus
}

const isPaymentOrderPayload = (
  value: Readonly<Record<string, unknown>>,
): value is PaymentOrderPayload => {
  const {
    amountMinor,
    currency,
    entitlementStatus,
    orderId,
    productId,
    providerPaymentIntentId,
    providerSessionId,
    status,
  } = value

  return (
    typeof amountMinor === 'string' &&
    /^(?:0|[1-9]\d*)$/u.test(amountMinor) &&
    typeof currency === 'string' &&
    /^[A-Z]{3}$/u.test(currency) &&
    isPaymentEntitlementStatus(entitlementStatus) &&
    typeof orderId === 'string' &&
    typeof productId === 'string' &&
    isNullableString(providerPaymentIntentId) &&
    isNullableString(providerSessionId) &&
    isPaymentOrderStatus(status)
  )
}

interface PaymentOrderHistoryPayload {
  readonly createdAt: string
  readonly fractionalDigits: number
  readonly paidAt: string | null
  readonly receiptUrl: string | null
  readonly refundedAt: string | null
}

const getHistoryPayload = (value: PaymentOrderPayload): PaymentOrderHistoryPayload | undefined => {
  const {createdAt, fractionalDigits, paidAt, receiptUrl, refundedAt} = value

  if (
    typeof fractionalDigits !== 'number' ||
    !Number.isInteger(fractionalDigits) ||
    fractionalDigits < 0 ||
    fractionalDigits > MAXIMUM_FRACTIONAL_DIGITS ||
    typeof createdAt !== 'string' ||
    !isNullableString(paidAt) ||
    !isNullableString(receiptUrl) ||
    !isNullableString(refundedAt)
  ) {
    return undefined
  }

  return {createdAt, fractionalDigits, paidAt, receiptUrl, refundedAt}
}

const parsePaymentOrder = (value: unknown): PaymentOrderStatusView | PaymentOrderHistoryView => {
  if (!isRecord(value) || !isPaymentOrderPayload(value)) {
    throw new TypeError('Payment order response has an invalid format')
  }

  const base: PaymentOrderStatusView = {
    amountMinor: value.amountMinor,
    currency: value.currency,
    entitlementStatus: value.entitlementStatus,
    orderId: value.orderId,
    productId: value.productId,
    providerPaymentIntentId: value.providerPaymentIntentId,
    providerSessionId: value.providerSessionId,
    status: value.status,
  } as const

  if (value.fractionalDigits === undefined) {
    return base
  }

  const history = getHistoryPayload(value)
  if (history === undefined) {
    throw new TypeError('Payment order history response has an invalid format')
  }

  return {...base, ...history}
}

const readPaymentOrderResponse = async (response: Response): Promise<PaymentOrderStatusView> => {
  if (response.status === HTTP_UNAUTHORIZED) {
    throw new PaymentAuthenticationRequiredError()
  }

  if (!response.ok) {
    throw new Error(`Payment order request failed: ${response.status}`)
  }

  return parsePaymentOrder(await response.json())
}

export const getPaymentOrder = async (orderId: string): Promise<PaymentOrderStatusView> =>
  readPaymentOrderResponse(
    await apiFetch(`payments/orders/${encodeURIComponent(orderId)}`, {
      cache: 'no-store',
      credentials: 'include',
      retry: false,
    }),
  )

export const listPaymentOrders = async (): Promise<readonly PaymentOrderHistoryView[]> => {
  const response = await apiFetch('payments/orders', {
    cache: 'no-store',
    credentials: 'include',
    retry: false,
  })

  if (response.status === HTTP_UNAUTHORIZED) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Payment history request failed: ${response.status}`)
  }

  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.orders)) {
    throw new TypeError('Payment history response has an invalid format')
  }

  return body.orders.map((order) => {
    const parsed = parsePaymentOrder(order)

    if (!('createdAt' in parsed)) {
      throw new TypeError('Payment history response has an invalid format')
    }

    return parsed
  })
}

export interface FormatMinorAmountOptions {
  readonly amountMinor: string
  readonly currency: string
  readonly fractionalDigits: number
  readonly locale?: string
}

export const formatMinorAmount = (options: FormatMinorAmountOptions): string => {
  const amount = Number(options.amountMinor)

  if (!Number.isSafeInteger(amount)) {
    return `${options.currency} ${options.amountMinor}`
  }

  return new Intl.NumberFormat(options.locale, {
    currency: options.currency,
    maximumFractionDigits: options.fractionalDigits,
    minimumFractionDigits: options.fractionalDigits,
    style: 'currency',
  }).format(amount / MINOR_UNIT_BASE ** options.fractionalDigits)
}
