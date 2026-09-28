/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({apiFetch: vi.fn()}))

vi.mock('../../http-client', () => httpMocks)

import {preparePayment} from '../prepare-payment'

const payment = {
  amountMinor: '1000',
  checkoutUrl: 'https://checkout.paddle.com/c/pay/cs_test_1',
  currency: 'USD',
  expiresAt: '2026-09-16T00:15:00.000Z',
  orderId: 'order-1',
  productId: 'product-1',
  provider: 'paddle',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('preparePayment', () => {
  it('should send only the product and provider and preserve the server response', async () => {
    httpMocks.apiFetch.mockResolvedValueOnce(Response.json(payment))

    await expect(preparePayment({productId: 'product-1', provider: 'paddle'})).resolves.toEqual(
      payment,
    )
    expect(httpMocks.apiFetch).toHaveBeenCalledWith('payments/start', {
      body: JSON.stringify({productId: 'product-1', provider: 'paddle'}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
      retry: false,
    })
  })

  it('should preserve a server rejection without treating it as a transport failure', async () => {
    const rejection = {code: 'price_changed', status: 'rejected'}
    httpMocks.apiFetch.mockResolvedValueOnce(Response.json(rejection, {status: 409}))

    await expect(preparePayment({productId: 'product-1'})).resolves.toEqual(rejection)
  })

  it('should reject a successful response with an invalid payment contract', async () => {
    httpMocks.apiFetch.mockResolvedValueOnce(Response.json({...payment, amountMinor: 10}))

    await expect(preparePayment({productId: 'product-1'})).rejects.toThrow(
      'Payment start response has an invalid format',
    )
  })
})
