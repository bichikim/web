/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const paymentMocks = vi.hoisted(() => {
  const pay = vi.fn().mockResolvedValue({orderId: 'order-1', status: 'started' as const})
  const client = {dispose: vi.fn(), pay}

  return {client, createPaymentClient: vi.fn(() => client), pay}
})

vi.mock('../create-payment-client', () => ({
  createPaymentClient: paymentMocks.createPaymentClient,
}))

import {pay} from '../pay'

const payment = {
  amountMinor: '1000',
  checkoutUrl: 'https://checkout.paddle.com/c/pay/cs_test_1',
  currency: 'USD',
  expiresAt: '2026-09-16T00:15:00.000Z',
  orderId: 'order-1',
  productId: 'product-1',
  provider: 'paddle' as const,
}

describe('pay', () => {
  beforeEach(() => {
    paymentMocks.pay.mockClear()
    paymentMocks.client.dispose.mockClear()
    paymentMocks.pay.mockResolvedValue({orderId: 'order-1', status: 'started'})
  })

  it('should reuse one payment client across public entry-point calls', async () => {
    await expect(Promise.all([pay(payment), pay(payment)])).resolves.toEqual([
      {orderId: 'order-1', status: 'started'},
      {orderId: 'order-1', status: 'started'},
    ])

    expect(paymentMocks.createPaymentClient).toHaveBeenCalledOnce()
    expect(paymentMocks.pay).toHaveBeenCalledTimes(2)
    expect(paymentMocks.pay).toHaveBeenNthCalledWith(1, payment)
    expect(paymentMocks.pay).toHaveBeenNthCalledWith(2, payment)
  })
})
