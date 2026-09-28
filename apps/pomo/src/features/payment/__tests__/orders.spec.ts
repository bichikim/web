/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({apiFetch: vi.fn()}))

vi.mock('../../http-client', () => httpMocks)

import {
  formatMinorAmount,
  getPaymentOrder,
  listPaymentOrders,
  PaymentAuthenticationRequiredError,
} from '../orders'

const status = {
  amountMinor: '1234',
  currency: 'USD',
  entitlementStatus: 'granted',
  orderId: 'order-1',
  productId: 'product-1',
  providerPaymentIntentId: 'pi-1',
  providerSessionId: 'cs-1',
  status: 'paid',
} as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe('payment order client', () => {
  it('should read an authenticated order without treating paid as entitlement completion itself', async () => {
    httpMocks.apiFetch.mockResolvedValueOnce(Response.json(status))

    await expect(getPaymentOrder('order-1')).resolves.toEqual(status)
    expect(httpMocks.apiFetch).toHaveBeenCalledWith('payments/orders/order-1', {
      cache: 'no-store',
      credentials: 'include',
      retry: false,
    })
  })

  it('should expose authentication as a distinct return-page state', async () => {
    httpMocks.apiFetch.mockResolvedValueOnce(new Response(null, {status: 401}))

    await expect(getPaymentOrder('order-1')).rejects.toBeInstanceOf(
      PaymentAuthenticationRequiredError,
    )
  })

  it('should return an empty history for anonymous album-library requests', async () => {
    httpMocks.apiFetch.mockResolvedValueOnce(new Response(null, {status: 401}))

    await expect(listPaymentOrders()).resolves.toEqual([])
  })

  it('should validate and preserve the server price metadata in purchase history', async () => {
    httpMocks.apiFetch.mockResolvedValueOnce(
      Response.json({
        orders: [
          {
            ...status,
            createdAt: '2026-09-20T00:00:00.000Z',
            fractionalDigits: 2,
            paidAt: '2026-09-20T00:01:00.000Z',
            receiptUrl: null,
            refundedAt: null,
          },
        ],
      }),
    )

    await expect(listPaymentOrders()).resolves.toMatchObject([
      {amountMinor: '1234', currency: 'USD', fractionalDigits: 2, productId: 'product-1'},
    ])
    expect(formatMinorAmount(statusToAmount())).toMatch(/12\.34/u)
  })
})

const statusToAmount = () => ({
  amountMinor: status.amountMinor,
  currency: status.currency,
  fractionalDigits: 2,
  locale: 'en-US',
})
