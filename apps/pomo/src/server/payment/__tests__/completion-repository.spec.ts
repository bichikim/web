/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({withTransactionalDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {...actual, ...databaseMocks}
})

import {
  fulfillPaddlePayment,
  revokePaddlePayment,
  PaddlePaymentValidationError,
} from '../completion-repository'

const transactionSelect = vi.fn()
const transactionInsert = vi.fn()
const transactionUpdate = vi.fn()
const transaction = {
  execute: vi.fn().mockResolvedValue([]),
  insert: transactionInsert,
  select: transactionSelect,
  update: transactionUpdate,
}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}

const ORDER = {
  amountMinor: 1000n,
  currency: 'USD',
  itemId: 'item-1',
  itemPriceId: 'price-1',
  itemProductId: 'product-1',
  orderId: 'order-1',
  orderStatus: 'pending',
  providerPaymentIntentId: null,
  providerSessionId: 'cs_test_1',
  refundedAmountMinor: 0n,
  userId: 'user-1',
}

const EVIDENCE = {
  amountMinor: 1000n,
  currency: 'USD',
  orderId: 'order-1',
  priceId: 'price-1',
  productId: 'product-1',
  providerPaymentIntentId: 'pi_test_1',
  providerSessionId: 'cs_test_1',
  userId: 'user-1',
} as const

const REFUND_EVIDENCE = {
  currency: 'USD',
  orderId: 'order-1',
  productId: 'product-1',
  providerPaymentIntentId: 'pi_test_1',
  totalRefundedMinor: 1000n,
  userId: 'user-1',
} as const

const createOrderQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      where: vi.fn(() => ({
        for: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
      })),
    })),
  })),
})

const createEntitlementQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
  })),
})

const createUpdate = (result: ReadonlyArray<unknown> = []) => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

const createGrantInsert = (result: ReadonlyArray<unknown>) => ({
  values: vi.fn(() => ({
    onConflictDoNothing: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

const queueFulfillment = (
  order = ORDER,
  entitlement: ReadonlyArray<unknown> = [],
  grant: ReadonlyArray<unknown> = [{id: 'grant-1'}],
) => {
  transactionSelect
    .mockReturnValueOnce(createOrderQuery([order]))
    .mockReturnValueOnce(createEntitlementQuery(entitlement))
  transactionUpdate.mockReturnValueOnce(createUpdate()).mockReturnValueOnce(createUpdate())
  transactionInsert.mockReturnValueOnce(createGrantInsert(grant))
}

beforeEach(() => {
  vi.clearAllMocks()
  transactionSelect.mockReset()
  transactionInsert.mockReset()
  transactionUpdate.mockReset()
  transaction.execute.mockReset().mockResolvedValue([])
  database.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(database),
  )
})

describe('Paddle payment completion repository', () => {
  it('should pay once, insert one grant, and release the reservation', async () => {
    queueFulfillment()

    await expect(
      fulfillPaddlePayment(EVIDENCE, new Date('2026-09-20T00:00:00.000Z')),
    ).resolves.toBe('granted')
    expect(transaction.execute).toHaveBeenCalledOnce()
    expect(transactionInsert).toHaveBeenCalledOnce()
    expect(transactionUpdate).toHaveBeenCalledTimes(2)
  })

  it('should treat a duplicate fulfillment as already granted', async () => {
    queueFulfillment({...ORDER, orderStatus: 'paid'}, [{id: 'grant-1', revokedAt: null}], [])

    await expect(fulfillPaddlePayment(EVIDENCE)).resolves.toBe('already_granted')
    expect(transactionInsert).toHaveBeenCalledOnce()
  })

  it('should allow PaymentIntent evidence to fill the already stored Checkout Session identity', async () => {
    queueFulfillment()

    await expect(fulfillPaddlePayment({...EVIDENCE, providerSessionId: null})).resolves.toBe(
      'granted',
    )
  })

  it('should record a full refund and revoke only the order item grant', async () => {
    transactionSelect
      .mockReturnValueOnce(createOrderQuery([{...ORDER, orderStatus: 'paid'}]))
      .mockReturnValueOnce(createEntitlementQuery([{id: 'grant-1', revokedAt: null}]))
    transactionUpdate
      .mockReturnValueOnce(createUpdate())
      .mockReturnValueOnce(createUpdate([{id: 'grant-1'}]))

    await expect(
      revokePaddlePayment(REFUND_EVIDENCE, true, new Date('2026-09-20T00:00:00.000Z')),
    ).resolves.toBe('revoked')
    const refundUpdate = transactionUpdate.mock.results[0]?.value.set.mock.calls[0]?.[0]
    expect(refundUpdate).toMatchObject({
      refundedAmountMinor: 1000n,
      status: 'refunded',
    })
  })

  it('should preserve the larger refund total when events arrive out of order', async () => {
    transactionSelect
      .mockReturnValueOnce(
        createOrderQuery([{...ORDER, orderStatus: 'paid', refundedAmountMinor: 600n}]),
      )
      .mockReturnValueOnce(createEntitlementQuery([{id: 'grant-1', revokedAt: null}]))
    transactionUpdate.mockReturnValueOnce(createUpdate())

    await expect(
      revokePaddlePayment({...REFUND_EVIDENCE, totalRefundedMinor: 200n}, true),
    ).resolves.toBe('partial')
    const refundUpdate = transactionUpdate.mock.results[0]?.value.set.mock.calls[0]?.[0]
    expect(refundUpdate).toMatchObject({
      refundedAmountMinor: 600n,
      status: 'partially_refunded',
    })
  })

  it('should reject evidence for another user before changing the order', async () => {
    transactionSelect.mockReturnValueOnce(createOrderQuery([{...ORDER, userId: 'other-user'}]))

    await expect(fulfillPaddlePayment(EVIDENCE)).rejects.toMatchObject({
      code: 'order_owner_mismatch',
    } satisfies Partial<PaddlePaymentValidationError>)
    expect(transactionUpdate).not.toHaveBeenCalled()
  })
})
