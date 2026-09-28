/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createPaddlePaymentAdapter} from '../paddle'

const payment = {
  amountMinor: '1000',
  checkoutUrl: 'https://pomo.example/payments/checkout?order_id=order-1&_ptxn=txn_123',
  currency: 'USD',
  expiresAt: '2026-09-16T00:15:00.000Z',
  orderId: 'order-1',
  productId: 'product-1',
  provider: 'paddle' as const,
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createPaddlePaymentAdapter', () => {
  it('should redirect the browser to the server-created Checkout URL', async () => {
    const assign = vi.fn()
    vi.stubGlobal('location', {assign})

    await expect(createPaddlePaymentAdapter().pay(payment)).resolves.toEqual({
      orderId: 'order-1',
      status: 'started',
    })
    expect(assign).toHaveBeenCalledWith(payment.checkoutUrl)
  })

  it('should report a provider error when browser navigation is unavailable', async () => {
    await expect(createPaddlePaymentAdapter().pay(payment)).resolves.toEqual({
      code: 'provider_error',
      status: 'failed',
    })
  })
})
