import {env} from 'src/env'

const HTTP_SERVICE_UNAVAILABLE = 503
const REQUEST_TIMEOUT_MILLISECONDS = 10_000

type RecordValue = Readonly<Record<string, unknown>>

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const parseMinorUnits = (value: unknown): bigint => {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(value)) {
    throw new TypeError('Paddle returned an invalid monetary amount')
  }

  return BigInt(value)
}

const parseCurrency = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/u.test(value)) {
    throw new TypeError('Paddle returned an invalid currency')
  }

  return value
}

const getFractionalDigits = (currency: string): number => {
  const digits = new Intl.NumberFormat('en-US', {currency, style: 'currency'}).resolvedOptions()
    .maximumFractionDigits
  if (digits === undefined) {
    throw new TypeError('Paddle returned an unsupported currency')
  }

  return digits
}

const getApiOrigin = (): string =>
  env.PADDLE_ENVIRONMENT === 'live' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'

export class PaddleProviderError extends Error {
  readonly code: 'provider_error' | 'provider_unavailable'
  readonly status: number

  constructor(code: 'provider_error' | 'provider_unavailable', status: number, cause?: unknown) {
    super(
      code === 'provider_unavailable'
        ? 'Paddle is not configured'
        : `Paddle request failed: ${status}`,
      {cause},
    )
    this.name = 'PaddleProviderError'
    this.code = code
    this.status = status
  }
}

const requestPaddle = async (path: string, body?: object): Promise<unknown> => {
  if (env.PADDLE_API_KEY === undefined || env.PADDLE_ENVIRONMENT === undefined) {
    throw new PaddleProviderError('provider_unavailable', HTTP_SERVICE_UNAVAILABLE)
  }

  let response: Response
  try {
    response = await fetch(`${getApiOrigin()}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${env.PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      method: body === undefined ? 'GET' : 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
    })
  } catch (cause) {
    throw new PaddleProviderError('provider_error', HTTP_SERVICE_UNAVAILABLE, cause)
  }

  if (!response.ok) {
    throw new PaddleProviderError('provider_error', response.status)
  }

  const envelope: unknown = await response.json()
  if (!isRecord(envelope) || !isRecord(envelope.data)) {
    throw new TypeError('Paddle returned an invalid response')
  }

  return envelope.data
}

export interface PaddlePrice {
  readonly active: boolean
  readonly amountMinor: bigint
  readonly currency: string
  readonly fractionalDigits: number
  readonly id: string
  readonly type: 'one_time' | 'recurring'
}

export const retrievePaddlePrice = async (priceId: string): Promise<PaddlePrice> => {
  if (!/^pri_[a-z\d]+$/u.test(priceId)) {
    throw new TypeError('Invalid Paddle Price ID')
  }

  const value = await requestPaddle(`/prices/${encodeURIComponent(priceId)}`)
  if (
    !isRecord(value) ||
    value.id !== priceId ||
    (value.status !== 'active' && value.status !== 'archived') ||
    !isRecord(value.unit_price) ||
    (value.billing_cycle !== null && !isRecord(value.billing_cycle))
  ) {
    throw new TypeError('Paddle returned an invalid Price')
  }

  const currency = parseCurrency(value.unit_price.currency_code)
  return {
    active: value.status === 'active',
    amountMinor: parseMinorUnits(value.unit_price.amount),
    currency,
    fractionalDigits: getFractionalDigits(currency),
    id: priceId,
    type: value.billing_cycle === null ? 'one_time' : 'recurring',
  }
}

export interface CreatePaddleTransactionInput {
  readonly checkoutUrl: string
  readonly orderId: string
  readonly priceId: string
  readonly productId: string
  readonly userId: string
}

export interface PaddleTransactionLink {
  readonly id: string
  readonly url: string
}

const parseTransactionLink = (value: unknown): PaddleTransactionLink => {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !/^txn_[a-z\d]+$/u.test(value.id) ||
    !isRecord(value.checkout) ||
    typeof value.checkout.url !== 'string'
  ) {
    throw new TypeError('Paddle returned an invalid Transaction')
  }

  const url = new URL(value.checkout.url)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new TypeError('Paddle returned an invalid Checkout URL')
  }

  return {id: value.id, url: url.toString()}
}

export const createPaddleTransaction = async (
  input: CreatePaddleTransactionInput,
): Promise<PaddleTransactionLink> => {
  // oxlint-disable eslint-js/camelcase -- Paddle's JSON API requires these field names.
  const data = await requestPaddle('/transactions', {
    checkout: {url: input.checkoutUrl},
    collection_mode: 'automatic',
    custom_data: {
      order_id: input.orderId,
      price_id: input.priceId,
      product_id: input.productId,
      user_id: input.userId,
    },
    items: [{price_id: input.priceId, quantity: 1}],
  })
  // oxlint-enable eslint-js/camelcase

  return parseTransactionLink(data)
}

export interface PaddleTransactionSnapshot {
  readonly checkoutUrl: string | null
  readonly customData: RecordValue
  readonly grossTotalMinor: bigint
  readonly id: string
  readonly items: ReadonlyArray<{readonly priceId: string; readonly quantity: number}>
  readonly status: string
  readonly adjustments: ReadonlyArray<{
    readonly action: string
    readonly amountMinor: bigint
    readonly currency: string
    readonly id: string
    readonly status: string
    readonly type: string
  }>
  readonly currency: string
}

export const retrievePaddleTransaction = async (
  transactionId: string,
): Promise<PaddleTransactionSnapshot> => {
  if (!/^txn_[a-z\d]+$/u.test(transactionId)) {
    throw new TypeError('Invalid Paddle Transaction ID')
  }

  const value = await requestPaddle(
    `/transactions/${encodeURIComponent(transactionId)}?include=adjustments`,
  )
  if (
    !isRecord(value) ||
    value.id !== transactionId ||
    typeof value.status !== 'string' ||
    !isRecord(value.custom_data) ||
    !Array.isArray(value.items) ||
    !isRecord(value.details) ||
    !isRecord(value.details.totals)
  ) {
    throw new TypeError('Paddle returned an invalid Transaction')
  }

  const items = value.items.map((item: unknown) => {
    if (
      !isRecord(item) ||
      !isRecord(item.price) ||
      typeof item.price.id !== 'string' ||
      typeof item.quantity !== 'number' ||
      !Number.isSafeInteger(item.quantity)
    ) {
      throw new TypeError('Paddle returned an invalid Transaction item')
    }

    return {priceId: item.price.id, quantity: item.quantity}
  })
  const adjustments = (Array.isArray(value.adjustments) ? value.adjustments : []).map(
    (adjustment: unknown) => {
      if (
        !isRecord(adjustment) ||
        typeof adjustment.id !== 'string' ||
        !adjustment.id.startsWith('adj_') ||
        typeof adjustment.action !== 'string' ||
        typeof adjustment.status !== 'string' ||
        typeof adjustment.type !== 'string' ||
        !isRecord(adjustment.totals)
      ) {
        throw new TypeError('Paddle returned an invalid Adjustment')
      }

      return {
        action: adjustment.action,
        amountMinor: parseMinorUnits(adjustment.totals.total),
        currency: parseCurrency(adjustment.currency_code),
        id: adjustment.id,
        status: adjustment.status,
        type: adjustment.type,
      }
    },
  )

  return {
    adjustments,
    checkoutUrl:
      isRecord(value.checkout) && typeof value.checkout.url === 'string'
        ? value.checkout.url
        : null,
    currency: parseCurrency(value.currency_code),
    customData: value.custom_data,
    grossTotalMinor: parseMinorUnits(value.details.totals.total),
    id: transactionId,
    items,
    status: value.status,
  }
}
