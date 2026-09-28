/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createPaymentClient} from '../create-payment-client'
import type {PaddlePayment, PaymentAdapter, PayResult} from '../types'

const payment: PaddlePayment = {
  amountMinor: '1000',
  checkoutUrl: 'https://checkout.paddle.com/c/pay/cs_test_1',
  currency: 'USD',
  expiresAt: '2026-09-16T00:15:00.000Z',
  orderId: 'order-1',
  productId: 'product-1',
  provider: 'paddle',
}

const createAdapter = () => {
  let resolvePayment: ((value: PayResult) => void) | undefined
  const adapter: PaymentAdapter = {
    dispose: vi.fn(),
    pay: vi.fn(
      (_payment: PaddlePayment): Promise<PayResult> =>
        new Promise((resolve) => {
          resolvePayment = resolve
        }),
    ),
    provider: 'paddle',
  }

  return {adapter, resolvePayment: () => resolvePayment}
}

describe('createPaymentClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should collapse duplicate clicks while a payment order is active', async () => {
    const {adapter, resolvePayment} = createAdapter()
    const client = createPaymentClient({adapters: [adapter]})

    const firstPayment = client.pay(payment)
    await expect(client.pay(payment)).resolves.toEqual({orderId: 'order-1', status: 'pending'})
    expect(adapter.pay).toHaveBeenCalledOnce()

    resolvePayment()?.({orderId: 'order-1', status: 'started'})
    await expect(firstPayment).resolves.toEqual({orderId: 'order-1', status: 'started'})
    await expect(client.pay(payment)).resolves.toEqual({orderId: 'order-1', status: 'pending'})

    client.dispose()
    expect(adapter.dispose).toHaveBeenCalledOnce()
  })

  it('should release the active order after an unsuccessful payment attempt', async () => {
    const adapter: PaymentAdapter = {
      dispose: vi.fn(),
      pay: vi
        .fn()
        .mockResolvedValueOnce({code: 'network_error', status: 'failed'})
        .mockResolvedValueOnce({orderId: 'order-1', status: 'started'}),
      provider: 'paddle',
    }
    const client = createPaymentClient({adapters: [adapter]})

    await expect(client.pay(payment)).resolves.toEqual({code: 'network_error', status: 'failed'})
    await expect(client.pay(payment)).resolves.toEqual({orderId: 'order-1', status: 'started'})
    expect(adapter.pay).toHaveBeenCalledTimes(2)
  })

  it('should release the active order when the payment adapter rejects', async () => {
    const adapter: PaymentAdapter = {
      dispose: vi.fn(),
      pay: vi
        .fn()
        .mockRejectedValueOnce(new Error('payment request failed'))
        .mockResolvedValueOnce({orderId: 'order-1', status: 'started'}),
      provider: 'paddle',
    }
    const client = createPaymentClient({adapters: [adapter]})

    await expect(client.pay(payment)).rejects.toThrow('payment request failed')
    await expect(client.pay(payment)).resolves.toEqual({orderId: 'order-1', status: 'started'})
    expect(adapter.pay).toHaveBeenCalledTimes(2)
  })
})
