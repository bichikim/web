import {
  closePaddlePayment,
  findPaddlePaymentOrderStatus,
  findPaddlePaymentReconciliationContext,
  fulfillPaddlePayment,
  PaddlePaymentValidationError,
  revokePaddlePayment,
  toPaddlePaymentEvidence,
} from './completion-repository'
import {
  type ClaimedPaddleProviderEvent,
  claimPaddleProviderEvent,
  listDuePaddleProviderEvents,
  markPaddleProviderEventFailed,
  markPaddleProviderEventProcessed,
  receivePaddleProviderEvent,
} from './provider-events'
import {
  PaddleProviderError,
  type PaddleTransactionSnapshot,
  retrievePaddlePrice,
  retrievePaddleTransaction,
} from './providers/paddle'
import {type PaddleWebhookEvent, parsePaddleWebhookPayload} from './paddle-webhook'

class PaddleWebhookProcessingError extends Error {
  readonly code: string
  readonly retryable: boolean

  constructor(code: string, retryable: boolean) {
    super(`Paddle webhook processing failed: ${code}`)
    this.name = 'PaddleWebhookProcessingError'
    this.code = code
    this.retryable = retryable
  }
}

const getTransactionId = (event: PaddleWebhookEvent): string => {
  const id = event.type.startsWith('adjustment.') ? event.data.transaction_id : event.data.id
  if (typeof id !== 'string' || !/^txn_[a-z\d]+$/u.test(id)) {
    throw new PaddlePaymentValidationError('payment_identity_mismatch')
  }

  return id
}

const getValidatedPayment = async (transaction: PaddleTransactionSnapshot) => {
  const priceId = transaction.items[0]?.priceId
  if (transaction.items.length !== 1 || priceId === undefined) {
    throw new PaddlePaymentValidationError('payment_price_mismatch')
  }

  const price = await retrievePaddlePrice(priceId)
  return toPaddlePaymentEvidence(transaction, price)
}

const processApprovedRefunds = async (transaction: PaddleTransactionSnapshot): Promise<void> => {
  const approvedRefunds = transaction.adjustments.filter(
    (adjustment) => adjustment.action === 'refund' && adjustment.status === 'approved',
  )
  if (approvedRefunds.length === 0) {
    return
  }

  const evidence = await getValidatedPayment(transaction)
  const order = await findPaddlePaymentOrderStatus(evidence.orderId, evidence.userId)
  if (order === null) {
    throw new PaddlePaymentValidationError('order_not_found')
  }
  if (
    order.providerSessionId !== transaction.id &&
    !order.providerSessionId?.startsWith('creating:')
  ) {
    throw new PaddlePaymentValidationError('payment_identity_mismatch')
  }
  if (
    transaction.grossTotalMinor === 0n ||
    approvedRefunds.some((adjustment) => adjustment.currency !== transaction.currency)
  ) {
    throw new PaddlePaymentValidationError('payment_price_mismatch')
  }

  const refundedGrossMinor = approvedRefunds.reduce(
    (total, adjustment) => total + adjustment.amountMinor,
    0n,
  )
  const isFullRefund =
    approvedRefunds.some((adjustment) => adjustment.type === 'full') ||
    refundedGrossMinor >= transaction.grossTotalMinor
  if (!isFullRefund && order.amountMinor <= 1n) {
    throw new PaddleWebhookProcessingError('partial_refund_requires_manual_review', false)
  }
  // The order stores the base catalog price; Paddle's settled total may include tax or conversion.
  const proportionalBaseMinor =
    (order.amountMinor * refundedGrossMinor) / transaction.grossTotalMinor
  const totalRefundedMinor = isFullRefund
    ? order.amountMinor
    : proportionalBaseMinor > 0n
      ? proportionalBaseMinor
      : 1n

  await revokePaddlePayment(
    {
      currency: evidence.currency,
      orderId: evidence.orderId,
      productId: evidence.productId,
      providerPaymentIntentId: null,
      totalRefundedMinor,
      userId: evidence.userId,
    },
    true,
  )
}

const reconcileTransaction = async (
  transactionId: string,
  expectedApprovedAdjustmentId?: string,
): Promise<void> => {
  const transaction = await retrievePaddleTransaction(transactionId)
  if (
    expectedApprovedAdjustmentId !== undefined &&
    !transaction.adjustments.some(
      (adjustment) =>
        adjustment.id === expectedApprovedAdjustmentId && adjustment.status === 'approved',
    )
  ) {
    throw new PaddleWebhookProcessingError('adjustment_not_yet_visible', true)
  }
  const evidence = await getValidatedPayment(transaction)

  if (transaction.status === 'completed') {
    await fulfillPaddlePayment(evidence)
    await processApprovedRefunds(transaction)
    return
  }

  if (transaction.status === 'canceled') {
    await closePaddlePayment(
      {
        orderId: evidence.orderId,
        productId: evidence.productId,
        providerPaymentIntentId: null,
        providerSessionId: transaction.id,
        userId: evidence.userId,
      },
      'canceled',
    )
  }
}

const processPaddleEvent = async (event: PaddleWebhookEvent): Promise<void> => {
  if (event.type === 'adjustment.created' || event.type === 'adjustment.updated') {
    const expectedAdjustmentId =
      event.data.action === 'refund' && event.data.status === 'approved' ? event.data.id : undefined
    if (expectedAdjustmentId !== undefined && typeof expectedAdjustmentId !== 'string') {
      throw new PaddlePaymentValidationError('payment_identity_mismatch')
    }

    await reconcileTransaction(getTransactionId(event), expectedAdjustmentId)
    return
  }

  if (event.type === 'transaction.completed' || event.type === 'transaction.canceled') {
    await reconcileTransaction(getTransactionId(event))
  }
}

const isRetryablePaddleError = (error: unknown): boolean => {
  if (error instanceof PaddlePaymentValidationError) {
    return false
  }

  if (error instanceof PaddleWebhookProcessingError) {
    return error.retryable
  }

  return true
}

const getPaddleErrorCode = (error: unknown): string => {
  if (
    error instanceof PaddlePaymentValidationError ||
    error instanceof PaddleProviderError ||
    error instanceof PaddleWebhookProcessingError
  ) {
    return error.code
  }

  return 'processing_error'
}

const processClaimedPaddleProviderEvent = async (
  claimedEvent: ClaimedPaddleProviderEvent,
  event: PaddleWebhookEvent,
): Promise<'processed' | 'rejected'> => {
  try {
    await processPaddleEvent(event)
    await markPaddleProviderEventProcessed({
      attemptCount: claimedEvent.attemptCount,
      eventId: claimedEvent.eventId,
    })
    return 'processed'
  } catch (error: unknown) {
    await markPaddleProviderEventFailed({
      errorCode: getPaddleErrorCode(error),
      eventId: claimedEvent.eventId,
      permanent: !isRetryablePaddleError(error),
      retryAttempt: claimedEvent.attemptCount,
    })
    if (!isRetryablePaddleError(error)) {
      console.error('Rejected Paddle provider event', error)
      return 'rejected'
    }

    throw error
  }
}

export type PaddleWebhookProcessingResult = 'duplicate' | 'processed' | 'rejected'

export const processPaddleWebhookEvent = async (
  event: PaddleWebhookEvent,
): Promise<PaddleWebhookProcessingResult> => {
  const received = await receivePaddleProviderEvent({
    eventType: event.type,
    payload: event.payload,
    providerEventId: event.id,
  })
  const claimed = await claimPaddleProviderEvent(received.eventId)
  if (claimed === null) {
    return 'duplicate'
  }

  return processClaimedPaddleProviderEvent(claimed, event)
}

export const reconcilePaddlePaymentOrder = async (
  orderId: string,
  userId: string,
): Promise<Awaited<ReturnType<typeof findPaddlePaymentOrderStatus>>> => {
  const context = await findPaddlePaymentReconciliationContext(orderId, userId)
  if (
    context !== null &&
    context.providerSessionId?.startsWith('txn_') &&
    (context.status === 'pending' ||
      context.status === 'paid' ||
      context.status === 'partially_refunded')
  ) {
    await reconcileTransaction(context.providerSessionId)
  }

  return findPaddlePaymentOrderStatus(orderId, userId)
}

export interface RetryPaddleProviderEventsResult {
  readonly failed: number
  readonly processed: number
  readonly rejected: number
  readonly skipped: number
}

export const retryPaddleProviderEvents = async (): Promise<RetryPaddleProviderEventsResult> => {
  const dueEvents = await listDuePaddleProviderEvents()
  const results = await Promise.all(
    dueEvents.map(async (dueEvent) => {
      const claimed = await claimPaddleProviderEvent(dueEvent.eventId)
      if (claimed === null) {
        return 'skipped' as const
      }

      let event: PaddleWebhookEvent
      try {
        event = parsePaddleWebhookPayload(claimed.payload)
        if (event.id !== claimed.providerEventId || event.type !== claimed.eventType) {
          throw new PaddlePaymentValidationError('payment_identity_mismatch')
        }
      } catch {
        await markPaddleProviderEventFailed({
          errorCode: 'invalid_stored_event',
          eventId: claimed.eventId,
          permanent: true,
          retryAttempt: claimed.attemptCount,
        })
        return 'rejected' as const
      }

      try {
        return await processClaimedPaddleProviderEvent(claimed, event)
      } catch (error: unknown) {
        console.error('Failed to retry Paddle provider event', error)
        return 'failed' as const
      }
    }),
  )

  return {
    failed: results.filter((result) => result === 'failed').length,
    processed: results.filter((result) => result === 'processed').length,
    rejected: results.filter((result) => result === 'rejected').length,
    skipped: results.filter((result) => result === 'skipped').length,
  }
}

export const getPaymentOrderStatus = findPaddlePaymentOrderStatus
