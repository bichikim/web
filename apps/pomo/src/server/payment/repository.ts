import {and, eq, gt, isNull, lte, or, sql} from 'drizzle-orm'

import type {PaymentPreparation, PaymentProvider, PaymentRejected} from 'src/features/payment/types'

import {
  commerceEntitlementGrants,
  commerceOffers,
  commerceOrderItems,
  commerceOrderReservations,
  commerceOrders,
  commerceProductAlbums,
  commerceProducts,
  getDatabase,
  musicAlbums,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../database'

const MILLISECONDS_PER_SECOND = 1000
const MINUTES_PER_HOUR = 60
const RESERVATION_DURATION_MINUTES = 15
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const RESERVATION_DURATION_MILLISECONDS =
  RESERVATION_DURATION_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const PADDLE_PENDING_ORDER_RETENTION_HOURS = 24
const PADDLE_PENDING_ORDER_RETENTION_MILLISECONDS =
  PADDLE_PENDING_ORDER_RETENTION_HOURS * MILLISECONDS_PER_HOUR

interface OfferPrice {
  readonly amountMinor: bigint
  readonly currency: string
  readonly fractionalDigits: number
}

interface PaymentOffer {
  readonly amountMinor: bigint | null
  readonly currency: string | null
  readonly externalProductId: string
  readonly fractionalDigits: number | null
  readonly offerId: string
  readonly productCode: string
}

export interface ReservePaymentOrderInput {
  readonly now?: Date
  readonly productId: string
  readonly provider: PaymentProvider
  readonly userId: string
}

export interface FindPaddlePaymentOrderContextInput {
  readonly now?: Date
  readonly orderId: string
  readonly productId: string
  readonly userId: string
}

export interface PaddlePaymentOrderContext {
  readonly amountMinor: bigint
  readonly currency: string
  readonly expiresAt: Date
  readonly fractionalDigits: number
  readonly orderId: string
  readonly priceId: string
  readonly productId: string
  readonly providerSessionId: string | null
  readonly userId: string
}

type PaymentReservationResult = PaymentPreparation | PaymentRejected
type PaymentTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]
type PaymentOrderStatus =
  | 'canceled'
  | 'failed'
  | 'paid'
  | 'partially_refunded'
  | 'pending'
  | 'refunded'

interface ExistingPaymentReservation {
  readonly amountMinor: bigint
  readonly currency: string
  readonly createdAt: Date
  readonly expiresAt: Date
  readonly fractionalDigits: number
  readonly orderId: string
  readonly orderStatus: PaymentOrderStatus
  readonly provider: string
  readonly reservationId: string
}

interface CreatePaymentOrderOptions {
  readonly input: ReservePaymentOrderInput
  readonly now: Date
  readonly offer: PaymentOffer
  readonly price: OfferPrice
}

const rejected = (code: PaymentRejected['code']): PaymentRejected => ({
  code,
  status: 'rejected',
})

const toPaymentPreparation = (payment: {
  readonly amountMinor: bigint
  readonly currency: string
  readonly expiresAt: Date
  readonly orderId: string
  readonly productId: string
  readonly provider: PaymentProvider
}): PaymentPreparation => ({
  amountMinor: payment.amountMinor.toString(),
  currency: payment.currency,
  expiresAt: payment.expiresAt.toISOString(),
  orderId: payment.orderId,
  productId: payment.productId,
  provider: payment.provider,
})

const findPaymentOffer = async (
  transaction: PaymentTransaction,
  input: Pick<ReservePaymentOrderInput, 'productId' | 'provider'>,
): Promise<PaymentOffer | undefined> => {
  const [offer] = await transaction
    .select({
      amountMinor: commerceOffers.amountMinor,
      currency: commerceOffers.currency,
      externalProductId: commerceOffers.externalProductId,
      fractionalDigits: commerceOffers.fractionalDigits,
      offerId: commerceOffers.id,
      productCode: commerceProducts.code,
    })
    .from(commerceOffers)
    .innerJoin(commerceProducts, eq(commerceOffers.productId, commerceProducts.id))
    .innerJoin(commerceProductAlbums, eq(commerceProductAlbums.productId, commerceProducts.id))
    .innerJoin(musicAlbums, eq(musicAlbums.id, commerceProductAlbums.albumId))
    .where(
      and(
        eq(commerceOffers.billingType, 'one_time'),
        eq(commerceOffers.productId, input.productId),
        eq(commerceOffers.provider, input.provider),
        eq(commerceOffers.status, 'active'),
        eq(commerceProducts.status, 'active'),
        eq(musicAlbums.status, 'published'),
      ),
    )
    .limit(1)

  return offer
}

const getOfferPrice = (offer: {
  readonly amountMinor: bigint | null
  readonly currency: string | null
  readonly fractionalDigits: number | null
}): OfferPrice | null => {
  const {amountMinor, currency, fractionalDigits} = offer

  return amountMinor === null || currency === null || fractionalDigits === null
    ? null
    : {amountMinor, currency, fractionalDigits}
}

const hasPaymentEntitlement = async (
  transaction: PaymentTransaction,
  input: ReservePaymentOrderInput,
  now: Date,
): Promise<boolean> => {
  const [entitlement] = await transaction
    .select({id: commerceEntitlementGrants.id})
    .from(commerceEntitlementGrants)
    .where(
      and(
        eq(commerceEntitlementGrants.productId, input.productId),
        eq(commerceEntitlementGrants.userId, input.userId),
        isNull(commerceEntitlementGrants.revokedAt),
        lte(commerceEntitlementGrants.startsAt, now),
        or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
      ),
    )
    .limit(1)

  return entitlement !== undefined
}

const findActivePaymentReservation = async (
  transaction: PaymentTransaction,
  input: ReservePaymentOrderInput,
): Promise<ExistingPaymentReservation | undefined> => {
  const [reservation] = await transaction
    .select({
      amountMinor: commerceOrders.amountMinor,
      createdAt: commerceOrderReservations.createdAt,
      currency: commerceOrders.currency,
      expiresAt: commerceOrderReservations.expiresAt,
      fractionalDigits: commerceOrders.fractionalDigits,
      orderId: commerceOrders.id,
      orderStatus: commerceOrders.status,
      provider: commerceOrders.provider,
      reservationId: commerceOrderReservations.id,
    })
    .from(commerceOrderReservations)
    .innerJoin(commerceOrders, eq(commerceOrders.id, commerceOrderReservations.orderId))
    .where(
      and(
        eq(commerceOrderReservations.productId, input.productId),
        eq(commerceOrderReservations.status, 'active'),
        eq(commerceOrderReservations.userId, input.userId),
      ),
    )
    .for('update')
    .limit(1)

  return reservation
}

const getExistingReservationPreparation = (
  reservation: ExistingPaymentReservation | undefined,
  input: ReservePaymentOrderInput,
  now: Date,
): PaymentReservationResult | null => {
  if (reservation === undefined) {
    return null
  }

  if (reservation.orderStatus === 'paid' || reservation.orderStatus === 'partially_refunded') {
    return rejected('already_owned')
  }

  if (reservation.orderStatus !== 'pending' || reservation.expiresAt <= now) {
    return null
  }

  return reservation.provider === input.provider
    ? toPaymentPreparation({
        amountMinor: reservation.amountMinor,
        currency: reservation.currency,
        expiresAt: reservation.expiresAt,
        orderId: reservation.orderId,
        productId: input.productId,
        provider: input.provider,
      })
    : rejected('provider_unavailable')
}

const releasePaymentReservation = async (
  transaction: PaymentTransaction,
  reservation: ExistingPaymentReservation,
  now: Date,
): Promise<void> => {
  await transaction
    .update(commerceOrderReservations)
    .set({releasedAt: now, status: 'released'})
    .where(
      and(
        eq(commerceOrderReservations.id, reservation.reservationId),
        eq(commerceOrderReservations.status, 'active'),
      ),
    )
}

const extendPaymentReservation = async (
  transaction: PaymentTransaction,
  reservation: ExistingPaymentReservation,
  now: Date,
): Promise<Date> => {
  const expiresAt = new Date(now.getTime() + RESERVATION_DURATION_MILLISECONDS)
  const [updatedReservation] = await transaction
    .update(commerceOrderReservations)
    .set({expiresAt})
    .where(
      and(
        eq(commerceOrderReservations.id, reservation.reservationId),
        eq(commerceOrderReservations.status, 'active'),
      ),
    )
    .returning({expiresAt: commerceOrderReservations.expiresAt})

  if (updatedReservation === undefined) {
    throw new Error('Failed to extend a payment order reservation')
  }

  return updatedReservation.expiresAt
}

const canReuseExpiredPaddleReservation = (
  reservation: ExistingPaymentReservation,
  input: ReservePaymentOrderInput,
  now: Date,
): boolean =>
  reservation.orderStatus === 'pending' &&
  reservation.provider === 'paddle' &&
  input.provider === 'paddle' &&
  reservation.createdAt <= now &&
  now.getTime() - reservation.createdAt.getTime() < PADDLE_PENDING_ORDER_RETENTION_MILLISECONDS

const createPaymentOrder = async (
  transaction: PaymentTransaction,
  options: CreatePaymentOrderOptions,
): Promise<PaymentPreparation> => {
  const {input, now, offer, price} = options
  const expiresAt = new Date(now.getTime() + RESERVATION_DURATION_MILLISECONDS)
  const [order] = await transaction
    .insert(commerceOrders)
    .values({
      amountMinor: price.amountMinor,
      currency: price.currency,
      fractionalDigits: price.fractionalDigits,
      id: crypto.randomUUID(),
      offerId: offer.offerId,
      provider: input.provider,
      status: 'pending',
      userId: input.userId,
    })
    .returning({id: commerceOrders.id})

  if (order === undefined) {
    throw new Error('Failed to create a payment order')
  }

  await transaction.insert(commerceOrderItems).values({
    amountMinor: price.amountMinor,
    currency: price.currency,
    fractionalDigits: price.fractionalDigits,
    offerId: offer.offerId,
    orderId: order.id,
    productCode: offer.productCode,
    productId: input.productId,
    providerExternalProductId: offer.externalProductId,
    quantity: 1,
  })

  const [reservation] = await transaction
    .insert(commerceOrderReservations)
    .values({
      attemptKey: crypto.randomUUID(),
      expiresAt,
      orderId: order.id,
      productId: input.productId,
      status: 'active',
      userId: input.userId,
    })
    .returning({expiresAt: commerceOrderReservations.expiresAt})

  if (reservation === undefined) {
    throw new Error('Failed to create a payment order reservation')
  }

  return toPaymentPreparation({
    amountMinor: price.amountMinor,
    currency: price.currency,
    expiresAt: reservation.expiresAt,
    orderId: order.id,
    productId: input.productId,
    provider: input.provider,
  })
}

const reservePaymentOrderInTransaction = async (
  transaction: PaymentTransaction,
  input: ReservePaymentOrderInput,
  now: Date,
): Promise<PaymentReservationResult> => {
  const lockKey = `commerce-payment:${input.userId}:${input.productId}`
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`)

  const offer = await findPaymentOffer(transaction, input)
  if (offer === undefined) {
    return rejected('unavailable')
  }

  const price = getOfferPrice(offer)
  if (price === null) {
    return rejected('unavailable')
  }

  if (await hasPaymentEntitlement(transaction, input, now)) {
    return rejected('already_owned')
  }

  const existingReservation = await findActivePaymentReservation(transaction, input)
  const existingPreparation = getExistingReservationPreparation(existingReservation, input, now)
  if (existingPreparation !== null) {
    return existingPreparation
  }

  if (existingReservation !== undefined) {
    if (existingReservation.orderStatus === 'pending' && existingReservation.expiresAt <= now) {
      if (!canReuseExpiredPaddleReservation(existingReservation, input, now)) {
        return rejected('unavailable')
      }

      const expiresAt = await extendPaymentReservation(transaction, existingReservation, now)
      return toPaymentPreparation({
        amountMinor: existingReservation.amountMinor,
        currency: existingReservation.currency,
        expiresAt,
        orderId: existingReservation.orderId,
        productId: input.productId,
        provider: input.provider,
      })
    }

    await releasePaymentReservation(transaction, existingReservation, now)
  }

  return createPaymentOrder(transaction, {input, now, offer, price})
}

const isOwnedPaymentProduct = async (
  userId: string,
  productId: string,
  now: Date,
): Promise<boolean> => {
  const [entitlement] = await getDatabase()
    .select({id: commerceEntitlementGrants.id})
    .from(commerceEntitlementGrants)
    .where(
      and(
        eq(commerceEntitlementGrants.productId, productId),
        eq(commerceEntitlementGrants.userId, userId),
        isNull(commerceEntitlementGrants.revokedAt),
        lte(commerceEntitlementGrants.startsAt, now),
        or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
      ),
    )
    .limit(1)

  return entitlement !== undefined
}

const hasCurrentOfferPrice = (context: {
  readonly amountMinor: bigint
  readonly currency: string
  readonly fractionalDigits: number
  readonly offerAmountMinor: bigint | null
  readonly offerCurrency: string | null
  readonly offerFractionalDigits: number | null
}): boolean =>
  context.offerAmountMinor === context.amountMinor &&
  context.offerCurrency === context.currency &&
  context.offerFractionalDigits === context.fractionalDigits

export const findPaddlePaymentOrderContext = async (
  input: FindPaddlePaymentOrderContextInput,
): Promise<PaddlePaymentOrderContext | PaymentRejected> => {
  const now = input.now ?? new Date()
  const [order] = await getDatabase()
    .select({
      albumStatus: musicAlbums.status,
      amountMinor: commerceOrders.amountMinor,
      currency: commerceOrders.currency,
      expiresAt: commerceOrderReservations.expiresAt,
      fractionalDigits: commerceOrders.fractionalDigits,
      offerAmountMinor: commerceOffers.amountMinor,
      offerBillingType: commerceOffers.billingType,
      offerCurrency: commerceOffers.currency,
      offerExternalProductId: commerceOffers.externalProductId,
      offerFractionalDigits: commerceOffers.fractionalDigits,
      offerId: commerceOffers.id,
      offerProductId: commerceOffers.productId,
      offerProvider: commerceOffers.provider,
      offerStatus: commerceOffers.status,
      orderExternalProductId: commerceOrderItems.providerExternalProductId,
      orderId: commerceOrders.id,
      orderOfferId: commerceOrderItems.offerId,
      productId: commerceOrderItems.productId,
      productStatus: commerceProducts.status,
      providerSessionId: commerceOrders.providerSessionId,
      userId: commerceOrders.userId,
    })
    .from(commerceOrders)
    .innerJoin(commerceOffers, eq(commerceOffers.id, commerceOrders.offerId))
    .innerJoin(commerceProducts, eq(commerceProducts.id, commerceOffers.productId))
    .innerJoin(commerceOrderItems, eq(commerceOrderItems.orderId, commerceOrders.id))
    .innerJoin(commerceOrderReservations, eq(commerceOrderReservations.orderId, commerceOrders.id))
    .innerJoin(commerceProductAlbums, eq(commerceProductAlbums.productId, commerceOffers.productId))
    .innerJoin(musicAlbums, eq(musicAlbums.id, commerceProductAlbums.albumId))
    .where(
      and(
        eq(commerceOrders.id, input.orderId),
        eq(commerceOrders.provider, 'paddle'),
        eq(commerceOrders.status, 'pending'),
        eq(commerceOrders.userId, input.userId),
        eq(commerceOffers.billingType, 'one_time'),
        eq(commerceOffers.productId, input.productId),
        eq(commerceOffers.provider, 'paddle'),
        eq(commerceOrderItems.productId, input.productId),
        eq(commerceOrderItems.offerId, commerceOrders.offerId),
        eq(commerceOrderReservations.productId, input.productId),
        eq(commerceOrderReservations.status, 'active'),
        eq(commerceOrderReservations.userId, input.userId),
        eq(musicAlbums.status, 'published'),
      ),
    )
    .limit(1)

  if (
    order === undefined ||
    order.expiresAt <= now ||
    order.albumStatus !== 'published' ||
    order.offerBillingType !== 'one_time' ||
    order.offerId !== order.orderOfferId ||
    order.offerProductId !== input.productId ||
    order.offerProvider !== 'paddle' ||
    order.offerStatus !== 'active'
  ) {
    return rejected('unavailable')
  }

  if (order.productStatus !== 'active') {
    return rejected('unavailable')
  }

  if (
    order.orderExternalProductId === null ||
    order.orderExternalProductId !== order.offerExternalProductId
  ) {
    return rejected('price_changed')
  }

  if (
    !hasCurrentOfferPrice({
      amountMinor: order.amountMinor,
      currency: order.currency,
      fractionalDigits: order.fractionalDigits,
      offerAmountMinor: order.offerAmountMinor,
      offerCurrency: order.offerCurrency,
      offerFractionalDigits: order.offerFractionalDigits,
    })
  ) {
    return rejected('price_changed')
  }

  if (await isOwnedPaymentProduct(input.userId, input.productId, now)) {
    return rejected('already_owned')
  }

  return {
    amountMinor: order.amountMinor,
    currency: order.currency,
    expiresAt: order.expiresAt,
    fractionalDigits: order.fractionalDigits,
    orderId: order.orderId,
    priceId: order.offerExternalProductId,
    productId: order.productId,
    providerSessionId: order.providerSessionId,
    userId: order.userId,
  }
}

export const reservePaymentOrder = async (
  input: ReservePaymentOrderInput,
): Promise<PaymentReservationResult> => {
  const now = input.now ?? new Date()

  return withTransactionalDatabase((database) =>
    database.transaction((transaction) =>
      reservePaymentOrderInTransaction(transaction, input, now),
    ),
  )
}
