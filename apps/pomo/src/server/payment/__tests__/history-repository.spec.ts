/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {...actual, getDatabase: databaseMocks.getDatabase}
})

import {listPaymentOrderHistory} from '../history-repository'

const order = {
  amountMinor: 1000n,
  createdAt: new Date('2026-09-20T00:00:00.000Z'),
  currency: 'USD',
  entitlementId: 'entitlement-1',
  entitlementRevokedAt: null,
  fractionalDigits: 2,
  orderId: 'order-1',
  paidAt: new Date('2026-09-20T00:01:00.000Z'),
  productId: 'product-1',
  providerPaymentIntentId: null,
  providerSessionId: null,
  refundedAt: null,
  status: 'paid' as const,
}

const where = vi.fn()
const select = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  where.mockReturnValue({orderBy: vi.fn().mockResolvedValue([order])})
  select.mockReturnValue({
    from: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        leftJoin: vi.fn(() => ({where})),
      })),
    })),
  })
  databaseMocks.getDatabase.mockReturnValue({select})
})

describe('payment order history', () => {
  it('includes an entitlement granted through another payment provider', async () => {
    await expect(listPaymentOrderHistory('user-1')).resolves.toEqual([
      {
        amountMinor: 1000n,
        createdAt: order.createdAt,
        currency: 'USD',
        entitlementStatus: 'granted',
        fractionalDigits: 2,
        orderId: 'order-1',
        paidAt: order.paidAt,
        productId: 'product-1',
        providerPaymentIntentId: null,
        providerSessionId: null,
        receiptUrl: null,
        refundedAt: null,
        status: 'paid',
      },
    ])
  })
})
