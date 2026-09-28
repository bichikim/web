/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({env: {PADDLE_ENVIRONMENT: 'sandbox'}}))

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  prepare: vi.fn(),
  price: vi.fn(),
  retrieve: vi.fn(),
  save: vi.fn(),
}))

vi.mock('../prepare-payment', () => ({preparePayment: mocks.prepare}))
vi.mock('../providers/paddle', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../providers/paddle')>()),
  createPaddleTransaction: mocks.create,
  retrievePaddlePrice: mocks.price,
  retrievePaddleTransaction: mocks.retrieve,
}))
vi.mock('../repository', () => ({
  findPaddlePaymentOrderContext: mocks.find,
}))
vi.mock('../transaction-claim', () => ({
  claimPaddleTransactionCreation: mocks.claim,
  savePaddleTransaction: mocks.save,
}))

import {startPayment} from '../start-payment'
import {PaddleProviderError} from '../providers/paddle'

const context = {
  amountMinor: 1000n,
  currency: 'USD',
  expiresAt: new Date('2026-09-23T00:15:00.000Z'),
  fractionalDigits: 2,
  orderId: 'order-1',
  priceId: 'pri_123',
  productId: 'product-1',
  providerSessionId: null,
  userId: 'user-1',
}
const checkoutUrl = 'https://pomo.example/payments/checkout?order_id=order-1&_ptxn=txn_123'
const options = {publicOrigin: 'https://pomo.example', userId: 'user-1'}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.prepare.mockResolvedValue({
    amountMinor: '1000',
    currency: 'USD',
    expiresAt: context.expiresAt.toISOString(),
    orderId: 'order-1',
    productId: 'product-1',
    provider: 'paddle',
  })
  mocks.find.mockResolvedValue(context)
  mocks.price.mockResolvedValue({
    active: true,
    amountMinor: 1000n,
    currency: 'USD',
    fractionalDigits: 2,
    id: 'pri_123',
    type: 'one_time',
  })
  mocks.claim.mockResolvedValue({claimId: 'creating:claim-1', status: 'claimed'})
  mocks.create.mockResolvedValue({id: 'txn_123', url: checkoutUrl})
  mocks.save.mockResolvedValue(true)
})

describe('startPayment Paddle transaction', () => {
  it('creates a transaction once and stores its ID', async () => {
    await expect(startPayment({productId: 'product-1'}, options)).resolves.toMatchObject({
      checkoutUrl,
      orderId: 'order-1',
      provider: 'paddle',
    })
    expect(mocks.create).toHaveBeenCalledWith({
      checkoutUrl: 'https://pomo.example/payments/checkout?order_id=order-1',
      orderId: 'order-1',
      priceId: 'pri_123',
      productId: 'product-1',
      userId: 'user-1',
    })
    expect(mocks.save).toHaveBeenCalledWith({
      claimId: 'creating:claim-1',
      orderId: 'order-1',
      transactionId: 'txn_123',
      userId: 'user-1',
    })
  })

  it('never creates a second transaction while the first create is uncertain', async () => {
    mocks.claim.mockResolvedValueOnce({status: 'creating'})
    await expect(startPayment({productId: 'product-1'}, options)).resolves.toEqual({
      code: 'unavailable',
      status: 'rejected',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('reuses the stored Paddle transaction after a response loss', async () => {
    mocks.claim.mockResolvedValueOnce({status: 'existing', transactionId: 'txn_123'})
    mocks.retrieve.mockResolvedValueOnce({
      checkoutUrl,
      customData: {order_id: 'order-1', user_id: 'user-1'},
      id: 'txn_123',
    })
    await expect(startPayment({productId: 'product-1'}, options)).resolves.toMatchObject({
      checkoutUrl,
      provider: 'paddle',
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('does not create a transaction if the stored price changed', async () => {
    mocks.find.mockResolvedValueOnce({...context, amountMinor: 1200n})
    await expect(startPayment({productId: 'product-1'}, options)).resolves.toEqual({
      code: 'price_changed',
      status: 'rejected',
    })
    expect(mocks.claim).not.toHaveBeenCalled()
  })

  it('does not claim a transaction when the live Paddle Price changed', async () => {
    mocks.price.mockResolvedValueOnce({
      active: true,
      amountMinor: 1200n,
      currency: 'USD',
      fractionalDigits: 2,
      id: 'pri_123',
      type: 'one_time',
    })
    await expect(startPayment({productId: 'product-1'}, options)).resolves.toEqual({
      code: 'price_changed',
      status: 'rejected',
    })
    expect(mocks.claim).not.toHaveBeenCalled()
  })

  it('returns an unavailable result for a Paddle API failure without retrying create', async () => {
    mocks.create.mockRejectedValueOnce(new PaddleProviderError('provider_error', 503))
    await expect(startPayment({productId: 'product-1'}, options)).resolves.toEqual({
      code: 'unavailable',
      status: 'rejected',
    })
    expect(mocks.create).toHaveBeenCalledTimes(1)
  })
})
