import type {
  PaymentPreparationResult,
  PaymentProvider,
  PreparePaymentRequest,
} from 'src/features/payment/types'

import {reservePaymentOrder} from './repository'

export interface PreparePaymentOptions {
  readonly now?: Date
  readonly userId: string | null
}

export const preparePayment = async (
  request: PreparePaymentRequest,
  options: PreparePaymentOptions,
): Promise<PaymentPreparationResult> => {
  if (options.userId === null) {
    return {code: 'login_required', status: 'rejected'}
  }

  const provider: PaymentProvider = request.provider ?? 'paddle'
  return reservePaymentOrder({
    now: options.now,
    productId: request.productId,
    provider,
    userId: options.userId,
  })
}
