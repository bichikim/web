/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({env: {PADDLE_ENVIRONMENT: 'sandbox'}}))

const mocks = vi.hoisted(() => ({
  claimEvent: vi.fn(),
  close: vi.fn(),
  findContext: vi.fn(),
  findStatus: vi.fn(),
  fulfill: vi.fn(),
  markFailed: vi.fn(),
  markProcessed: vi.fn(),
  receiveEvent: vi.fn(),
  retrievePrice: vi.fn(),
  retrieveTransaction: vi.fn(),
  revoke: vi.fn(),
}))

vi.mock('../providers/paddle', () => ({
  PaddleProviderError: class PaddleProviderError extends Error {},
  retrievePaddlePrice: mocks.retrievePrice,
  retrievePaddleTransaction: mocks.retrieveTransaction,
}))
vi.mock('../completion-repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../completion-repository')>()),
  closePaddlePayment: mocks.close,
  findPaddlePaymentOrderStatus: mocks.findStatus,
  findPaddlePaymentReconciliationContext: mocks.findContext,
  fulfillPaddlePayment: mocks.fulfill,
  revokePaddlePayment: mocks.revoke,
}))
vi.mock('../provider-events', () => ({
  claimPaddleProviderEvent: mocks.claimEvent,
  listDuePaddleProviderEvents: vi.fn().mockResolvedValue([]),
  markPaddleProviderEventFailed: mocks.markFailed,
  markPaddleProviderEventProcessed: mocks.markProcessed,
  receivePaddleProviderEvent: mocks.receiveEvent,
}))

import {processPaddleWebhookEvent} from '../paddle-completion'
import type {PaddleWebhookEvent} from '../paddle-webhook'

const event = (type: string, data: Readonly<Record<string, unknown>>): PaddleWebhookEvent => ({
  data,
  id: 'evt_123',
  occurredAt: '2026-09-23T00:00:00.000Z',
  payload: {data, event_id: 'evt_123', event_type: type},
  type,
})

const transaction = {
  adjustments: [] as Array<{
    action: string
    amountMinor: bigint
    currency: string
    id: string
    status: string
    type: string
  }>,
  checkoutUrl: null,
  currency: 'USD',
  customData: {
    order_id: 'order-1',
    price_id: 'pri_123',
    product_id: 'product-1',
    user_id: 'user-1',
  },
  grossTotalMinor: 1100n,
  id: 'txn_123',
  items: [{priceId: 'pri_123', quantity: 1}],
  status: 'completed',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.receiveEvent.mockResolvedValue({eventId: 'inbox-1', status: 'new'})
  mocks.claimEvent.mockResolvedValue({attemptCount: 1, eventId: 'inbox-1'})
  mocks.retrieveTransaction.mockResolvedValue(transaction)
  mocks.retrievePrice.mockResolvedValue({
    active: true,
    amountMinor: 1000n,
    currency: 'USD',
    fractionalDigits: 2,
    id: 'pri_123',
    type: 'one_time',
  })
  mocks.findStatus.mockResolvedValue({
    amountMinor: 1000n,
    orderId: 'order-1',
    providerSessionId: 'txn_123',
  })
})

describe('Paddle completion', () => {
  it('retrieves a completed transaction before granting an album', async () => {
    await expect(
      processPaddleWebhookEvent(event('transaction.completed', {id: 'txn_123'})),
    ).resolves.toBe('processed')
    expect(mocks.fulfill).toHaveBeenCalledWith({
      amountMinor: 1000n,
      currency: 'USD',
      orderId: 'order-1',
      priceId: 'pri_123',
      productId: 'product-1',
      providerPaymentIntentId: null,
      providerSessionId: 'txn_123',
      userId: 'user-1',
    })
    expect(mocks.markProcessed).toHaveBeenCalledOnce()
  })

  it('does not process a duplicate provider event twice', async () => {
    mocks.claimEvent.mockResolvedValueOnce(null)
    await expect(
      processPaddleWebhookEvent(event('transaction.completed', {id: 'txn_123'})),
    ).resolves.toBe('duplicate')
    expect(mocks.retrieveTransaction).not.toHaveBeenCalled()
  })

  it('revokes access only after an approved full refund', async () => {
    mocks.retrieveTransaction.mockResolvedValueOnce({
      ...transaction,
      adjustments: [
        {
          action: 'refund',
          amountMinor: 1100n,
          currency: 'USD',
          id: 'adj_123',
          status: 'approved',
          type: 'full',
        },
      ],
    })

    const refundEvent = event('adjustment.updated', {
      action: 'refund',
      id: 'adj_123',
      status: 'approved',
      transaction_id: 'txn_123',
    })
    await expect(processPaddleWebhookEvent(refundEvent)).resolves.toBe('processed')
    expect(mocks.revoke).toHaveBeenCalledWith(
      expect.objectContaining({orderId: 'order-1', totalRefundedMinor: 1000n}),
      true,
    )
  })

  it('sends an unrepresentable partial refund for manual review without revoking access', async () => {
    mocks.findStatus.mockResolvedValueOnce({
      amountMinor: 1n,
      orderId: 'order-1',
      providerSessionId: 'txn_123',
    })
    mocks.retrieveTransaction.mockResolvedValueOnce({
      ...transaction,
      adjustments: [
        {
          action: 'refund',
          amountMinor: 500n,
          currency: 'USD',
          id: 'adj_123',
          status: 'approved',
          type: 'partial',
        },
      ],
    })

    const refundEvent = event('adjustment.updated', {
      action: 'refund',
      id: 'adj_123',
      status: 'approved',
      transaction_id: 'txn_123',
    })
    await expect(processPaddleWebhookEvent(refundEvent)).resolves.toBe('rejected')
    expect(mocks.revoke).not.toHaveBeenCalled()
    expect(mocks.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        errorCode: 'partial_refund_requires_manual_review',
        permanent: true,
      }),
    )
  })

  it('retries an approved refund until it appears in a transaction read', async () => {
    const refundEvent = event('adjustment.updated', {
      action: 'refund',
      id: 'adj_123',
      status: 'approved',
      transaction_id: 'txn_123',
    })
    await expect(processPaddleWebhookEvent(refundEvent)).rejects.toThrow(
      'adjustment_not_yet_visible',
    )
    expect(mocks.revoke).not.toHaveBeenCalled()
    expect(mocks.markFailed).toHaveBeenCalledWith(
      expect.objectContaining({errorCode: 'adjustment_not_yet_visible', permanent: false}),
    )
  })
})
