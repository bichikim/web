/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({
  isUserRequestResolutionError: vi.fn(() => false),
  resolveUserRequest: vi.fn(),
}))
const paymentMocks = vi.hoisted(() => ({startPayment: vi.fn()}))

vi.mock('src/server/auth/resolve-user-request', () => authMocks)
vi.mock('src/server/payment', () => paymentMocks)

import {invokeApiRoute} from '../../__tests__/invoke'
import {POST} from '../start'

const PRODUCT_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const preparedPayment = {
  amountMinor: '1000',
  checkoutUrl: 'https://checkout.paddle.com/c/pay/cs_test_1',
  currency: 'USD',
  expiresAt: '2026-09-16T00:15:00.000Z',
  orderId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  productId: PRODUCT_ID,
  provider: 'paddle' as const,
}

const createRequest = (body: unknown): Request =>
  new Request('https://pomo.example/api/payments/start', {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://pomo.example',
    },
    method: 'POST',
  })

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.resolveUserRequest.mockResolvedValue({
    access: 'user',
    cookies: ['session=refreshed'],
    userId: 'user-1',
  })
  paymentMocks.startPayment.mockResolvedValue(preparedPayment)
})

describe('start payment route', () => {
  it('should reject a cross-origin request before resolving authentication', async () => {
    const request = new Request('https://pomo.example/api/payments/start', {
      body: JSON.stringify({productId: PRODUCT_ID}),
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://attacker.example',
      },
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({error: 'csrf_failed'})
    expect(authMocks.resolveUserRequest).not.toHaveBeenCalled()
    expect(paymentMocks.startPayment).not.toHaveBeenCalled()
  })

  it('should reject a request without an origin before starting an order', async () => {
    const request = new Request('https://pomo.example/api/payments/start', {
      body: JSON.stringify({productId: PRODUCT_ID}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({error: 'csrf_failed'})
    expect(authMocks.resolveUserRequest).not.toHaveBeenCalled()
  })

  it('should start payment for the authenticated user and preserve session cookies', async () => {
    const response = await invokeApiRoute(POST, createRequest({productId: PRODUCT_ID}))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual(preparedPayment)
    expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
    expect(paymentMocks.startPayment).toHaveBeenCalledWith(
      {productId: PRODUCT_ID},
      {publicOrigin: import.meta.env.VITE_POMO_PUBLIC_ORIGIN, userId: 'user-1'},
    )
  })

  it('should reject anonymous payment attempts before starting an order', async () => {
    authMocks.resolveUserRequest.mockResolvedValue({access: 'anonymous', cookies: [], userId: null})

    const response = await invokeApiRoute(POST, createRequest({productId: PRODUCT_ID}))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: 'unauthorized'})
    expect(paymentMocks.startPayment).not.toHaveBeenCalled()
  })

  it('should reject malformed payment requests before starting an order', async () => {
    const response = await invokeApiRoute(POST, createRequest({productId: 'not-a-uuid'}))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({error: 'invalid_request'})
    expect(paymentMocks.startPayment).not.toHaveBeenCalled()
  })

  it('should map a provider rejection to a temporary service response', async () => {
    paymentMocks.startPayment.mockResolvedValue({
      code: 'provider_unavailable',
      status: 'rejected',
    })

    const response = await invokeApiRoute(POST, createRequest({productId: PRODUCT_ID}))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: 'provider_unavailable',
      status: 'rejected',
    })
  })
})
