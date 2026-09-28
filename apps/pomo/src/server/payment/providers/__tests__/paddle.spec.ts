import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({
  env: {PADDLE_API_KEY: 'test-api-key', PADDLE_ENVIRONMENT: 'sandbox'},
}))

import {createPaddleTransaction, retrievePaddlePrice, retrievePaddleTransaction} from '../paddle'

const mockFetch = vi.fn<typeof fetch>()

const jsonResponse = (data: object): Response =>
  new Response(JSON.stringify({data}), {
    headers: {'Content-Type': 'application/json'},
    status: 200,
  })

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('Paddle provider', () => {
  it('reads one-time base Price metadata from Paddle', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        billing_cycle: null,
        id: 'pri_123',
        status: 'active',
        unit_price: {amount: '1000', currency_code: 'USD'},
      }),
    )

    await expect(retrievePaddlePrice('pri_123')).resolves.toEqual({
      active: true,
      amountMinor: 1000n,
      currency: 'USD',
      fractionalDigits: 2,
      id: 'pri_123',
      type: 'one_time',
    })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://sandbox-api.paddle.com/prices/pri_123',
      expect.objectContaining({method: 'GET'}),
    )
  })

  it('creates one server-owned transaction for the selected Price', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        checkout: {url: 'https://example.com/payments/checkout?order_id=order-1&_ptxn=txn_123'},
        id: 'txn_123',
      }),
    )

    await expect(
      createPaddleTransaction({
        checkoutUrl: 'https://example.com/payments/checkout?order_id=order-1',
        orderId: 'order-1',
        priceId: 'pri_123',
        productId: 'product-1',
        userId: 'user-1',
      }),
    ).resolves.toEqual({
      id: 'txn_123',
      url: 'https://example.com/payments/checkout?order_id=order-1&_ptxn=txn_123',
    })

    const [, request] = mockFetch.mock.calls[0] ?? []
    expect(JSON.parse(String(request?.body))).toEqual({
      checkout: {url: 'https://example.com/payments/checkout?order_id=order-1'},
      collection_mode: 'automatic',
      custom_data: {
        order_id: 'order-1',
        price_id: 'pri_123',
        product_id: 'product-1',
        user_id: 'user-1',
      },
      items: [{price_id: 'pri_123', quantity: 1}],
    })
  })

  it('reads transaction state and approved adjustment amounts', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        adjustments: [
          {
            action: 'refund',
            currency_code: 'USD',
            id: 'adj_123',
            status: 'approved',
            totals: {total: '500'},
            type: 'partial',
          },
        ],
        checkout: {url: 'https://example.com/payments/checkout?_ptxn=txn_123'},
        currency_code: 'USD',
        custom_data: {order_id: 'order-1'},
        details: {totals: {total: '1100'}},
        id: 'txn_123',
        items: [{price: {id: 'pri_123'}, quantity: 1}],
        status: 'completed',
      }),
    )

    await expect(retrievePaddleTransaction('txn_123')).resolves.toMatchObject({
      adjustments: [{amountMinor: 500n, currency: 'USD', id: 'adj_123', status: 'approved'}],
      grossTotalMinor: 1100n,
      id: 'txn_123',
      status: 'completed',
    })
  })
})
