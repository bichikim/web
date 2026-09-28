/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {
    ...actual,
    getDatabase: databaseMocks.getDatabase,
    withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
  }
})

import {findPaddlePaymentOrderContext, reservePaymentOrder} from '../repository'
import {savePaddleTransaction} from '../transaction-claim'

const transactionSelect = vi.fn()
const transactionInsert = vi.fn()
const transactionUpdate = vi.fn()
const transaction = {
  execute: vi.fn().mockResolvedValue([]),
  insert: transactionInsert,
  select: transactionSelect,
  update: transactionUpdate,
}
const transactionalDatabase = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}

const createOfferQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
        })),
      })),
    })),
  })),
})

const createLimitQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)}))})),
})

const createReservationQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      where: vi.fn(() => ({
        for: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
      })),
    })),
  })),
})

const createPaddleOrderContextQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              innerJoin: vi.fn(() => ({
                where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
              })),
            })),
          })),
        })),
      })),
    })),
  })),
})

const createReturningInsert = (result: ReadonlyArray<unknown>) => ({
  values: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
})

const createPlainInsert = () => ({values: vi.fn().mockResolvedValue(undefined)})

const createReservationUpdate = () => ({
  set: vi.fn(() => ({where: vi.fn().mockResolvedValue(undefined)})),
})

const createReturningUpdate = (result: ReadonlyArray<unknown>) => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

const queuePaymentReads = (
  offer: ReadonlyArray<unknown>,
  entitlement: ReadonlyArray<unknown>,
  reservation: ReadonlyArray<unknown>,
) => {
  transactionSelect
    .mockReturnValueOnce(createOfferQuery(offer))
    .mockReturnValueOnce(createLimitQuery(entitlement))
    .mockReturnValueOnce(createReservationQuery(reservation))
}

const input = {
  now: new Date('2026-09-16T00:00:00.000Z'),
  productId: 'product-1',
  provider: 'paddle' as const,
  userId: 'user-1',
}

const offer = {
  amountMinor: 1000n,
  currency: 'USD',
  externalProductId: 'price-1',
  fractionalDigits: 2,
  offerId: 'offer-1',
  productCode: 'album.product-1',
}

beforeEach(() => {
  vi.clearAllMocks()
  transactionSelect.mockReset()
  transactionInsert.mockReset()
  transactionUpdate.mockReset()
  transaction.execute.mockReset().mockResolvedValue([])
  transactionalDatabase.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(transactionalDatabase),
  )
  databaseMocks.getDatabase.mockReturnValue({select: transactionSelect})
})

describe('reservePaymentOrder', () => {
  it('should reserve a priced order through the database transaction', async () => {
    queuePaymentReads([offer], [], [])
    transactionInsert
      .mockReturnValueOnce(createReturningInsert([{id: 'order-1'}]))
      .mockReturnValueOnce(createPlainInsert())
      .mockReturnValueOnce(
        createReturningInsert([{expiresAt: new Date('2026-09-16T00:15:00.000Z')}]),
      )

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      amountMinor: '1000',
      currency: 'USD',
      expiresAt: '2026-09-16T00:15:00.000Z',
      orderId: 'order-1',
      productId: 'product-1',
      provider: 'paddle',
    })
    expect(transaction.execute).toHaveBeenCalledOnce()
    expect(transactionInsert).toHaveBeenCalledTimes(3)
  })

  it('should reuse an active pending order and its stored price snapshot', async () => {
    queuePaymentReads(
      [{...offer, amountMinor: 2000n}],
      [],
      [
        {
          amountMinor: 1000n,
          createdAt: new Date('2026-09-15T23:45:00.000Z'),
          currency: 'USD',
          expiresAt: new Date('2026-09-16T00:15:00.000Z'),
          fractionalDigits: 2,
          orderId: 'order-1',
          orderStatus: 'pending',
          provider: 'paddle',
          reservationId: 'reservation-1',
        },
      ],
    )

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      amountMinor: '1000',
      currency: 'USD',
      expiresAt: '2026-09-16T00:15:00.000Z',
      orderId: 'order-1',
      productId: 'product-1',
      provider: 'paddle',
    })
    expect(transactionInsert).not.toHaveBeenCalled()
    expect(transactionUpdate).not.toHaveBeenCalled()
  })

  it('should reject an already owned product before creating an order', async () => {
    queuePaymentReads([offer], [{id: 'entitlement-1'}], [])

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      code: 'already_owned',
      status: 'rejected',
    })
    expect(transactionInsert).not.toHaveBeenCalled()
    expect(transactionSelect).toHaveBeenCalledTimes(2)
  })

  it('should reject an offer without a complete server price', async () => {
    queuePaymentReads([{...offer, currency: null}], [], [])

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      code: 'unavailable',
      status: 'rejected',
    })
    expect(transactionSelect).toHaveBeenCalledOnce()
    expect(transactionInsert).not.toHaveBeenCalled()
  })

  it('should reject a pending reservation claimed by another provider', async () => {
    queuePaymentReads(
      [offer],
      [],
      [
        {
          amountMinor: 1000n,
          createdAt: new Date('2026-09-15T23:45:00.000Z'),
          currency: 'USD',
          expiresAt: new Date('2026-09-16T00:15:00.000Z'),
          fractionalDigits: 2,
          orderId: 'order-1',
          orderStatus: 'pending',
          provider: 'apps-in-toss',
          reservationId: 'reservation-1',
        },
      ],
    )

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      code: 'provider_unavailable',
      status: 'rejected',
    })
    expect(transactionInsert).not.toHaveBeenCalled()
    expect(transactionUpdate).not.toHaveBeenCalled()
  })

  it('should release an expired reservation before creating a new order', async () => {
    queuePaymentReads(
      [offer],
      [],
      [
        {
          amountMinor: 1000n,
          createdAt: new Date('2026-09-15T23:45:00.000Z'),
          currency: 'USD',
          expiresAt: new Date('2026-09-15T23:59:00.000Z'),
          fractionalDigits: 2,
          orderId: 'order-1',
          orderStatus: 'failed',
          provider: 'paddle',
          reservationId: 'reservation-1',
        },
      ],
    )
    transactionUpdate.mockReturnValueOnce(createReservationUpdate())
    transactionInsert
      .mockReturnValueOnce(createReturningInsert([{id: 'order-2'}]))
      .mockReturnValueOnce(createPlainInsert())
      .mockReturnValueOnce(
        createReturningInsert([{expiresAt: new Date('2026-09-16T00:15:00.000Z')}]),
      )

    await expect(reservePaymentOrder(input)).resolves.toMatchObject({
      amountMinor: '1000',
      orderId: 'order-2',
    })
    expect(transactionUpdate).toHaveBeenCalledOnce()
    expect(transactionInsert).toHaveBeenCalledTimes(3)
  })

  it('should extend an expired pending Paddle reservation without creating another order', async () => {
    queuePaymentReads(
      [offer],
      [],
      [
        {
          amountMinor: 1000n,
          createdAt: new Date('2026-09-15T23:45:00.000Z'),
          currency: 'USD',
          expiresAt: new Date('2026-09-15T23:59:00.000Z'),
          fractionalDigits: 2,
          orderId: 'order-1',
          orderStatus: 'pending',
          provider: 'paddle',
          reservationId: 'reservation-1',
        },
      ],
    )
    transactionUpdate.mockReturnValueOnce({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{expiresAt: new Date('2026-09-16T00:15:00.000Z')}]),
        })),
      })),
    })

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      amountMinor: '1000',
      currency: 'USD',
      expiresAt: '2026-09-16T00:15:00.000Z',
      orderId: 'order-1',
      productId: 'product-1',
      provider: 'paddle',
    })
    expect(transactionUpdate).toHaveBeenCalledOnce()
    expect(transactionInsert).not.toHaveBeenCalled()
  })

  it('should keep an expired pending reservation blocked after the provider retention window', async () => {
    queuePaymentReads(
      [offer],
      [],
      [
        {
          amountMinor: 1000n,
          createdAt: new Date('2026-09-14T23:45:00.000Z'),
          currency: 'USD',
          expiresAt: new Date('2026-09-15T23:59:00.000Z'),
          fractionalDigits: 2,
          orderId: 'order-1',
          orderStatus: 'pending',
          provider: 'paddle',
          reservationId: 'reservation-1',
        },
      ],
    )

    await expect(reservePaymentOrder(input)).resolves.toEqual({
      code: 'unavailable',
      status: 'rejected',
    })
    expect(transactionUpdate).not.toHaveBeenCalled()
    expect(transactionInsert).not.toHaveBeenCalled()
  })
})

const paddleOrderContext = {
  albumStatus: 'published',
  amountMinor: 1000n,
  currency: 'USD',
  expiresAt: new Date('2026-09-16T00:15:00.000Z'),
  fractionalDigits: 2,
  idempotencyKey: 'attempt-1',
  offerAmountMinor: 1000n,
  offerBillingType: 'one_time',
  offerCurrency: 'USD',
  offerExternalProductId: 'price-1',
  offerFractionalDigits: 2,
  offerId: 'offer-1',
  offerProductId: 'product-1',
  offerProvider: 'paddle',
  offerStatus: 'active',
  orderExternalProductId: 'price-1',
  orderId: 'order-1',
  orderOfferId: 'offer-1',
  productId: 'product-1',
  productStatus: 'active',
  providerSessionId: null,
  userId: 'user-1',
}

describe('findPaddlePaymentOrderContext', () => {
  const input = {
    now: new Date('2026-09-16T00:00:00.000Z'),
    orderId: 'order-1',
    productId: 'product-1',
    userId: 'user-1',
  }

  it('should return the stored order and current Paddle Price after ownership validation', async () => {
    transactionSelect
      .mockReturnValueOnce(createPaddleOrderContextQuery([paddleOrderContext]))
      .mockReturnValueOnce(createLimitQuery([]))

    await expect(findPaddlePaymentOrderContext(input)).resolves.toEqual({
      amountMinor: 1000n,
      currency: 'USD',
      expiresAt: new Date('2026-09-16T00:15:00.000Z'),
      fractionalDigits: 2,
      orderId: 'order-1',
      priceId: 'price-1',
      productId: 'product-1',
      providerSessionId: null,
      userId: 'user-1',
    })
  })

  it('should reject an order whose stored Paddle Price differs from the active offer', async () => {
    transactionSelect.mockReturnValueOnce(
      createPaddleOrderContextQuery([{...paddleOrderContext, orderExternalProductId: 'price-old'}]),
    )

    await expect(findPaddlePaymentOrderContext(input)).resolves.toEqual({
      code: 'price_changed',
      status: 'rejected',
    })
    expect(transactionSelect).toHaveBeenCalledOnce()
  })

  it('should reject an order that became owned before Checkout creation', async () => {
    transactionSelect
      .mockReturnValueOnce(createPaddleOrderContextQuery([paddleOrderContext]))
      .mockReturnValueOnce(createLimitQuery([{id: 'entitlement-1'}]))

    await expect(findPaddlePaymentOrderContext(input)).resolves.toEqual({
      code: 'already_owned',
      status: 'rejected',
    })
  })

  it('should reject a pending order after its album is archived', async () => {
    transactionSelect.mockReturnValueOnce(
      createPaddleOrderContextQuery([{...paddleOrderContext, albumStatus: 'archived'}]),
    )

    await expect(findPaddlePaymentOrderContext(input)).resolves.toEqual({
      code: 'unavailable',
      status: 'rejected',
    })
  })
})

describe('savePaddleTransaction', () => {
  it('links a claimed transaction or accepts a webhook-winning save race', async () => {
    transactionUpdate.mockReturnValueOnce(createReturningUpdate([{id: 'order-1'}]))

    await expect(
      savePaddleTransaction({
        claimId: 'creating:claim-1',
        orderId: 'order-1',
        transactionId: 'txn_123',
        userId: 'user-1',
      }),
    ).resolves.toBe(true)
    expect(transactionUpdate).toHaveBeenCalledOnce()
  })
})
