/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({resolveUserRequest: vi.fn()}))
const paymentMocks = vi.hoisted(() => ({reconcilePaddlePaymentOrder: vi.fn()}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/payment', () => paymentMocks)

import {invokeApiRoute} from '../../../../__tests__/invoke'
import {GET} from '../../[orderId]'

const ORDER_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const createRequest = () => new Request(`https://pomo.example/api/payments/orders/${ORDER_ID}`)

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: ['session=refreshed'],
    userId: 'user-1',
  })
  paymentMocks.reconcilePaddlePaymentOrder.mockResolvedValue({
    amountMinor: 1000n,
    currency: 'USD',
    entitlementStatus: 'granted',
    orderId: ORDER_ID,
    productId: 'product-1',
    providerPaymentIntentId: 'pi_test_1',
    providerSessionId: 'cs_test_1',
    status: 'paid',
  })
})

describe('payment order status route', () => {
  it('should reconcile and serialize the authenticated order status', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {orderId: ORDER_ID})

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      amountMinor: '1000',
      currency: 'USD',
      entitlementStatus: 'granted',
      orderId: ORDER_ID,
      productId: 'product-1',
      providerPaymentIntentId: 'pi_test_1',
      providerSessionId: 'cs_test_1',
      status: 'paid',
    })
    expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
    expect(paymentMocks.reconcilePaddlePaymentOrder).toHaveBeenCalledWith(ORDER_ID, 'user-1')
  })

  it('should not reveal an order that is not owned by the authenticated user', async () => {
    paymentMocks.reconcilePaddlePaymentOrder.mockResolvedValue(null)

    const response = await invokeApiRoute(GET, createRequest(), {orderId: ORDER_ID})

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({error: 'payment_order_not_found'})
  })

  it('should reject anonymous status requests', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({access: 'anonymous', cookies: [], userId: null})

    const response = await invokeApiRoute(GET, createRequest(), {orderId: ORDER_ID})

    expect(response.status).toBe(401)
    expect(paymentMocks.reconcilePaddlePaymentOrder).not.toHaveBeenCalled()
  })

  it('should reject malformed order IDs before resolving authentication', async () => {
    const response = await invokeApiRoute(GET, createRequest(), {orderId: 'not-an-order'})

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
    expect(authMocks.resolveUserRequest).not.toHaveBeenCalled()
  })
})
