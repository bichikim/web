import {describe, expect, it} from 'vitest'

import {getPaymentReturnKind} from '../../../features/payment'

const order = {
  amountMinor: '1000',
  currency: 'USD',
  entitlementStatus: 'missing' as const,
  orderId: 'order-1',
  productId: 'product-1',
  providerPaymentIntentId: null,
  providerSessionId: null,
  status: 'pending' as const,
}

describe('payment return status mapping', () => {
  it('should complete only when payment and entitlement are both settled', () => {
    expect(
      getPaymentReturnKind({...order, entitlementStatus: 'granted', status: 'paid'}, false),
    ).toBe('completed')
    expect(getPaymentReturnKind({...order, status: 'paid'}, false)).toBe('processing')
  })

  it('should preserve canceled and refunded outcomes', () => {
    expect(getPaymentReturnKind({...order, status: 'canceled'}, false)).toBe('canceled')
    expect(getPaymentReturnKind({...order, status: 'pending'}, true)).toBe('canceled')
    expect(getPaymentReturnKind({...order, entitlementStatus: 'revoked'}, false)).toBe('refunded')
    expect(getPaymentReturnKind({...order, status: 'failed'}, false)).toBe('failed')
  })
})
