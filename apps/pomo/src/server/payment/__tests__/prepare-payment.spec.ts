/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({reservePaymentOrder: vi.fn()}))

vi.mock('../repository', () => repositoryMocks)

import {preparePayment} from '../prepare-payment'

beforeEach(() => {
  repositoryMocks.reservePaymentOrder.mockReset()
})

describe('preparePayment', () => {
  it('should reject an anonymous request without touching the database', async () => {
    await expect(
      preparePayment({productId: 'product-1'}, {now: new Date(), userId: null}),
    ).resolves.toEqual({code: 'login_required', status: 'rejected'})
    expect(repositoryMocks.reservePaymentOrder).not.toHaveBeenCalled()
  })

  it('should default an authenticated web request to Paddle', async () => {
    repositoryMocks.reservePaymentOrder.mockResolvedValue({
      amountMinor: '1000',
      currency: 'USD',
      expiresAt: '2026-09-16T00:15:00.000Z',
      orderId: 'order-1',
      productId: 'product-1',
      provider: 'paddle',
    })
    const now = new Date('2026-09-16T00:00:00.000Z')

    await expect(
      preparePayment({productId: 'product-1'}, {now, userId: 'user-1'}),
    ).resolves.toEqual({
      amountMinor: '1000',
      currency: 'USD',
      expiresAt: '2026-09-16T00:15:00.000Z',
      orderId: 'order-1',
      productId: 'product-1',
      provider: 'paddle',
    })
    expect(repositoryMocks.reservePaymentOrder).toHaveBeenCalledWith({
      now,
      productId: 'product-1',
      provider: 'paddle',
      userId: 'user-1',
    })
  })

  it('should preserve an explicit Apps in Toss provider choice', async () => {
    repositoryMocks.reservePaymentOrder.mockResolvedValue({
      code: 'unavailable',
      status: 'rejected',
    })

    await expect(
      preparePayment({productId: 'product-1', provider: 'apps-in-toss'}, {userId: 'user-1'}),
    ).resolves.toEqual({code: 'unavailable', status: 'rejected'})
    expect(repositoryMocks.reservePaymentOrder).toHaveBeenCalledWith({
      productId: 'product-1',
      provider: 'apps-in-toss',
      userId: 'user-1',
    })
  })
})
