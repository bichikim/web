import type {
  PaymentPreparationResult,
  PaymentProvider,
  PaymentRejected,
  PreparedPayment,
  PreparePaymentRequest,
} from 'src/features/payment/types'

import {
  createPaddleTransaction,
  PaddleProviderError,
  retrievePaddlePrice,
  retrievePaddleTransaction,
} from './providers/paddle'
import {findPaddlePaymentOrderContext} from './repository'
import {claimPaddleTransactionCreation, savePaddleTransaction} from './transaction-claim'
import {preparePayment} from './prepare-payment'

export interface StartPaymentOptions {
  readonly now?: Date
  readonly publicOrigin: string
  readonly userId: string
}

const rejected = (code: PaymentRejected['code']): PaymentRejected => ({
  code,
  status: 'rejected',
})

const isRejected = (result: PaymentPreparationResult): result is PaymentRejected =>
  'status' in result && result.status === 'rejected'

type PaddlePaymentContext = Awaited<ReturnType<typeof findPaddlePaymentOrderContext>>

const isRejectedContext = (result: PaddlePaymentContext): result is PaymentRejected =>
  'status' in result && result.status === 'rejected'

const getCheckoutPageUrl = (publicOrigin: string, orderId: string): string => {
  const origin = new URL(publicOrigin)
  if (origin.protocol !== 'https:' && origin.hostname !== 'localhost') {
    throw new TypeError('Paddle checkout origin must use HTTPS')
  }

  const url = new URL('/payments/checkout', origin.origin)
  url.searchParams.set('order_id', orderId)
  return url.toString()
}

const validatePaddleCheckoutUrl = (
  urlValue: string,
  expectedPageUrl: string,
  transactionId: string,
): string => {
  const actual = new URL(urlValue)
  const expected = new URL(expectedPageUrl)
  if (
    actual.origin !== expected.origin ||
    actual.pathname !== expected.pathname ||
    actual.searchParams.get('order_id') !== expected.searchParams.get('order_id') ||
    actual.searchParams.get('_ptxn') !== transactionId
  ) {
    throw new TypeError('Paddle returned a Checkout URL for a different payment')
  }

  return actual.toString()
}

const matchesPreparedOrder = (
  prepared: Exclude<PaymentPreparationResult, PaymentRejected>,
  context: Exclude<PaddlePaymentContext, PaymentRejected>,
): boolean =>
  prepared.amountMinor === context.amountMinor.toString() &&
  prepared.currency === context.currency &&
  prepared.orderId === context.orderId &&
  prepared.productId === context.productId

const matchesPaddlePrice = (
  context: Exclude<PaddlePaymentContext, PaymentRejected>,
  price: Awaited<ReturnType<typeof retrievePaddlePrice>>,
): boolean =>
  price.active &&
  price.type === 'one_time' &&
  price.id === context.priceId &&
  price.amountMinor === context.amountMinor &&
  price.currency === context.currency &&
  price.fractionalDigits === context.fractionalDigits

const toPreparedPayment = (
  context: Exclude<PaddlePaymentContext, PaymentRejected>,
  checkoutUrl: string,
): PreparedPayment => ({
  amountMinor: context.amountMinor.toString(),
  checkoutUrl,
  currency: context.currency,
  expiresAt: context.expiresAt.toISOString(),
  orderId: context.orderId,
  productId: context.productId,
  provider: 'paddle',
})

export const startPayment = async (
  request: PreparePaymentRequest,
  options: StartPaymentOptions,
): Promise<PaymentRejected | PreparedPayment> => {
  const provider: PaymentProvider = request.provider ?? 'paddle'
  if (provider === 'apps-in-toss') {
    return rejected('provider_unavailable')
  }

  const prepared = await preparePayment(
    {productId: request.productId, provider},
    {now: options.now, userId: options.userId},
  )
  if (isRejected(prepared)) {
    return prepared
  }

  const context = await findPaddlePaymentOrderContext({
    now: options.now,
    orderId: prepared.orderId,
    productId: prepared.productId,
    userId: options.userId,
  })
  if (isRejectedContext(context)) {
    return context
  }
  if (!matchesPreparedOrder(prepared, context)) {
    return rejected('price_changed')
  }

  let price
  try {
    price = await retrievePaddlePrice(context.priceId)
  } catch (error: unknown) {
    if (error instanceof PaddleProviderError) {
      return rejected(
        error.code === 'provider_unavailable' ? 'provider_unavailable' : 'unavailable',
      )
    }

    throw error
  }
  if (!matchesPaddlePrice(context, price)) {
    return rejected('price_changed')
  }

  const checkoutPageUrl = getCheckoutPageUrl(options.publicOrigin, context.orderId)
  const claim = await claimPaddleTransactionCreation(context.orderId, context.userId)
  if (claim.status === 'creating') {
    return rejected('unavailable')
  }

  try {
    if (claim.status === 'existing') {
      const transaction = await retrievePaddleTransaction(claim.transactionId)
      if (
        transaction.customData.order_id !== context.orderId ||
        transaction.customData.user_id !== context.userId ||
        transaction.checkoutUrl === null
      ) {
        throw new TypeError('Paddle transaction does not match the payment order')
      }

      return toPreparedPayment(
        context,
        validatePaddleCheckoutUrl(transaction.checkoutUrl, checkoutPageUrl, transaction.id),
      )
    }

    const transaction = await createPaddleTransaction({
      checkoutUrl: checkoutPageUrl,
      orderId: context.orderId,
      priceId: context.priceId,
      productId: context.productId,
      userId: context.userId,
    })
    const checkoutUrl = validatePaddleCheckoutUrl(transaction.url, checkoutPageUrl, transaction.id)
    const saved = await savePaddleTransaction({
      claimId: claim.claimId,
      orderId: context.orderId,
      transactionId: transaction.id,
      userId: context.userId,
    })
    if (!saved) {
      throw new Error('Failed to persist the Paddle Transaction')
    }

    return toPreparedPayment(context, checkoutUrl)
  } catch (error: unknown) {
    if (error instanceof PaddleProviderError) {
      return rejected(
        error.code === 'provider_unavailable' ? 'provider_unavailable' : 'unavailable',
      )
    }

    throw error
  }
}
