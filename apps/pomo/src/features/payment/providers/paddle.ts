import type {PaddlePayment, PaddlePaymentAdapter, PayResult} from '../types'

const redirectToPaddle = (payment: PaddlePayment): PayResult => {
  if (typeof globalThis.location === 'undefined') {
    return {code: 'provider_error', status: 'failed'}
  }

  try {
    globalThis.location.assign(payment.checkoutUrl)
    return {orderId: payment.orderId, status: 'started'}
  } catch {
    return {code: 'provider_error', status: 'failed'}
  }
}

export const createPaddlePaymentAdapter = (): PaddlePaymentAdapter => ({
  dispose: () => undefined,
  pay: async (payment) => redirectToPaddle(payment),
  provider: 'paddle',
})
