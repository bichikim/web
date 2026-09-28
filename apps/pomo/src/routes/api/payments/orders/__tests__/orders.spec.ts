/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({resolveUserRequest: vi.fn()}))
const paymentMocks = vi.hoisted(() => ({listPaymentOrderHistory: vi.fn()}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/payment', () => paymentMocks)

import {invokeApiRoute} from '../../../__tests__/invoke'
import {GET} from '../../orders'

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: ['session=refreshed'],
    userId: 'user-1',
  })
  paymentMocks.listPaymentOrderHistory.mockResolvedValue([
    {
      amountMinor: 1234n,
      createdAt: new Date('2026-09-20T00:00:00.000Z'),
      currency: 'USD',
      entitlementStatus: 'granted',
      fractionalDigits: 2,
      orderId: 'order-1',
      paidAt: new Date('2026-09-20T00:01:00.000Z'),
      productId: 'product-1',
      providerPaymentIntentId: 'pi-1',
      providerSessionId: 'cs-1',
      receiptUrl: null,
      refundedAt: null,
      status: 'paid',
    },
  ])
})

describe('payment order history route', () => {
  it('should serialize only the authenticated user history without caching it publicly', async () => {
    const response = await invokeApiRoute(
      GET,
      new Request('https://pomo.example/api/payments/orders'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      orders: [
        {
          amountMinor: '1234',
          createdAt: '2026-09-20T00:00:00.000Z',
          currency: 'USD',
          entitlementStatus: 'granted',
          fractionalDigits: 2,
          orderId: 'order-1',
          paidAt: '2026-09-20T00:01:00.000Z',
          productId: 'product-1',
          providerPaymentIntentId: 'pi-1',
          providerSessionId: 'cs-1',
          receiptUrl: null,
          refundedAt: null,
          status: 'paid',
        },
      ],
    })
    expect(paymentMocks.listPaymentOrderHistory).toHaveBeenCalledWith('user-1')
  })

  it('should not query history for an anonymous visitor', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({access: 'anonymous', cookies: [], userId: null})

    const response = await invokeApiRoute(
      GET,
      new Request('https://pomo.example/api/payments/orders'),
    )

    expect(response.status).toBe(401)
    expect(paymentMocks.listPaymentOrderHistory).not.toHaveBeenCalled()
  })
})
