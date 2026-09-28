import type {PaymentOrderStatusView} from './orders'

export type PaymentReturnKind = 'canceled' | 'completed' | 'failed' | 'processing' | 'refunded'

export const getPaymentReturnKind = (
  order: PaymentOrderStatusView,
  returnedFromCanceledCheckout: boolean,
): PaymentReturnKind => {
  if (
    order.entitlementStatus === 'granted' &&
    (order.status === 'paid' || order.status === 'partially_refunded')
  ) {
    return 'completed'
  }

  if (order.status === 'refunded' || order.entitlementStatus === 'revoked') {
    return 'refunded'
  }

  if (order.status === 'failed') {
    return 'failed'
  }

  if (order.status === 'canceled' || returnedFromCanceledCheckout) {
    return 'canceled'
  }

  return 'processing'
}
