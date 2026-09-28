import {sql} from 'drizzle-orm'
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {musicAlbums} from './music'
import {pomoUsers} from './users'

export const commerceProductStatusEnum = pgEnum('commerce_product_status', ['active', 'archived'])
export const commerceOfferBillingTypeEnum = pgEnum('commerce_offer_billing_type', [
  'one_time',
  'subscription',
])
export const commerceOfferStatusEnum = pgEnum('commerce_offer_status', ['active', 'inactive'])
export const commerceOrderStatusEnum = pgEnum('commerce_order_status', [
  'pending',
  'paid',
  'partially_refunded',
  'refunded',
  'canceled',
  'failed',
])
export const commerceOrderReservationStatusEnum = pgEnum('commerce_order_reservation_status', [
  'active',
  'released',
])
export const commerceProviderEventStatusEnum = pgEnum('commerce_provider_event_status', [
  'received',
  'processed',
  'failed',
])

export const commerceProducts = pgTable(
  'commerce_products',
  {
    code: varchar({length: 128}).notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    id: uuid().primaryKey().defaultRandom(),
    status: commerceProductStatusEnum().notNull().default('active'),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('commerce_products_code_index').on(table.code)],
)

export const commerceProductAlbums = pgTable(
  'commerce_product_albums',
  {
    albumId: uuid()
      .notNull()
      .references(() => musicAlbums.id, {onDelete: 'restrict'}),
    productId: uuid()
      .notNull()
      .references(() => commerceProducts.id, {onDelete: 'cascade'}),
  },
  (table) => [primaryKey({columns: [table.productId, table.albumId]})],
)

export const commerceOffers = pgTable(
  'commerce_offers',
  {
    amountMinor: bigint({mode: 'bigint'}),
    billingType: commerceOfferBillingTypeEnum().notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    currency: varchar({length: 3}),
    externalProductId: varchar({length: 255}).notNull(),
    fractionalDigits: smallint(),
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => commerceProducts.id, {onDelete: 'restrict'}),
    provider: varchar({length: 64}).notNull(),
    status: commerceOfferStatusEnum().notNull().default('inactive'),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check(
      'commerce_offers_amount_minor_check',
      sql`${table.amountMinor} is null or ${table.amountMinor} >= 0`,
    ),
    check(
      'commerce_offers_currency_check',
      sql`${table.currency} is null or ${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      'commerce_offers_fractional_digits_check',
      sql`${table.fractionalDigits} is null or ${table.fractionalDigits} between 0 and 6`,
    ),
    check(
      'commerce_offers_price_metadata_check',
      sql`(${table.amountMinor} is null and ${table.currency} is null and ${table.fractionalDigits} is null)
        or (${table.amountMinor} is not null and ${table.currency} is not null
          and ${table.fractionalDigits} is not null)`,
    ),
    uniqueIndex('commerce_offers_provider_external_product_index').on(
      table.provider,
      table.externalProductId,
    ),
    uniqueIndex('commerce_offers_product_provider_index').on(table.productId, table.provider),
    index('commerce_offers_product_status_index').on(table.productId, table.status),
  ],
)

export const commerceOrders = pgTable(
  'commerce_orders',
  {
    amountMinor: bigint({mode: 'bigint'}).notNull(),
    canceledAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    currency: varchar({length: 3}).notNull(),
    failedAt: timestamp({withTimezone: true}),
    fractionalDigits: smallint().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    offerId: uuid()
      .notNull()
      .references(() => commerceOffers.id, {onDelete: 'restrict'}),
    paidAt: timestamp({withTimezone: true}),
    paymentMethod: varchar({length: 64}),
    provider: varchar({length: 64}).notNull(),
    providerOrderId: varchar({length: 255}),
    providerPaymentIntentId: varchar({length: 255}),
    providerSessionId: varchar({length: 255}),
    refundedAmountMinor: bigint({mode: 'bigint'})
      .notNull()
      .default(sql`0`),
    refundedAt: timestamp({withTimezone: true}),
    status: commerceOrderStatusEnum().notNull().default('pending'),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'restrict'}),
  },
  (table) => [
    check('commerce_orders_amount_minor_check', sql`${table.amountMinor} >= 0`),
    check(
      'commerce_orders_refunded_amount_check',
      sql`${table.refundedAmountMinor} between 0 and ${table.amountMinor}`,
    ),
    check('commerce_orders_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'commerce_orders_fractional_digits_check',
      sql`${table.fractionalDigits} between 0 and 6`,
    ),
    uniqueIndex('commerce_orders_provider_order_index').on(table.provider, table.providerOrderId),
    uniqueIndex('commerce_orders_provider_payment_intent_index').on(
      table.provider,
      table.providerPaymentIntentId,
    ),
    uniqueIndex('commerce_orders_provider_session_index').on(
      table.provider,
      table.providerSessionId,
    ),
    index('commerce_orders_user_created_at_index').on(table.userId, table.createdAt),
  ],
)

export const commerceOrderReservations = pgTable(
  'commerce_order_reservations',
  {
    attemptKey: varchar({length: 128}).notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    expiresAt: timestamp({withTimezone: true}).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => commerceOrders.id, {onDelete: 'cascade'}),
    productId: uuid()
      .notNull()
      .references(() => commerceProducts.id, {onDelete: 'restrict'}),
    releasedAt: timestamp({withTimezone: true}),
    status: commerceOrderReservationStatusEnum().notNull().default('active'),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'restrict'}),
  },
  (table) => [
    check(
      'commerce_order_reservations_release_check',
      sql`(${table.status} = 'active' and ${table.releasedAt} is null)
        or (${table.status} = 'released' and ${table.releasedAt} is not null)`,
    ),
    uniqueIndex('commerce_order_reservations_attempt_key_index').on(table.attemptKey),
    uniqueIndex('commerce_order_reservations_order_index').on(table.orderId),
    uniqueIndex('commerce_order_reservations_active_user_product_index')
      .on(table.userId, table.productId)
      .where(sql`${table.status} = 'active'`),
    index('commerce_order_reservations_status_expiry_index').on(table.status, table.expiresAt),
  ],
)

export const commerceOrderItems = pgTable(
  'commerce_order_items',
  {
    amountMinor: bigint({mode: 'bigint'}).notNull(),
    currency: varchar({length: 3}).notNull(),
    fractionalDigits: smallint().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    offerId: uuid()
      .notNull()
      .references(() => commerceOffers.id, {onDelete: 'restrict'}),
    orderId: uuid()
      .notNull()
      .references(() => commerceOrders.id, {onDelete: 'restrict'}),
    productCode: varchar({length: 128}).notNull(),
    productId: uuid()
      .notNull()
      .references(() => commerceProducts.id, {onDelete: 'restrict'}),
    providerExternalProductId: varchar({length: 255}),
    quantity: integer().notNull().default(1),
  },
  (table) => [
    check('commerce_order_items_amount_minor_check', sql`${table.amountMinor} >= 0`),
    check('commerce_order_items_currency_check', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'commerce_order_items_fractional_digits_check',
      sql`${table.fractionalDigits} between 0 and 6`,
    ),
    check('commerce_order_items_quantity_check', sql`${table.quantity} = 1`),
    uniqueIndex('commerce_order_items_order_offer_index').on(table.orderId, table.offerId),
  ],
)

export const commerceEntitlementGrants = pgTable(
  'commerce_entitlement_grants',
  {
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    endsAt: timestamp({withTimezone: true}),
    id: uuid().primaryKey().defaultRandom(),
    orderItemId: uuid()
      .notNull()
      .references(() => commerceOrderItems.id, {onDelete: 'restrict'}),
    productId: uuid()
      .notNull()
      .references(() => commerceProducts.id, {onDelete: 'restrict'}),
    revokedAt: timestamp({withTimezone: true}),
    revokeReason: text(),
    startsAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'restrict'}),
  },
  (table) => [
    check(
      'commerce_entitlement_grants_period_check',
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      'commerce_entitlement_grants_revocation_check',
      sql`(${table.revokedAt} is null and ${table.revokeReason} is null)
        or (${table.revokedAt} is not null and ${table.revokeReason} is not null)`,
    ),
    uniqueIndex('commerce_entitlement_grants_order_item_index').on(table.orderItemId),
    index('commerce_entitlement_grants_access_index').on(
      table.userId,
      table.productId,
      table.startsAt,
      table.endsAt,
    ),
  ],
)

export const commerceProviderEvents = pgTable(
  'commerce_provider_events',
  {
    attemptCount: integer().notNull().default(0),
    claimedAt: timestamp({withTimezone: true}),
    errorCode: varchar({length: 64}),
    eventType: varchar({length: 128}).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    nextAttemptAt: timestamp({withTimezone: true}),
    payload: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
    processedAt: timestamp({withTimezone: true}),
    provider: varchar({length: 64}).notNull(),
    providerEventId: varchar({length: 255}).notNull(),
    receivedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    status: commerceProviderEventStatusEnum().notNull().default('received'),
  },
  (table) => [
    check('commerce_provider_events_attempt_count_check', sql`${table.attemptCount} >= 0`),
    uniqueIndex('commerce_provider_events_provider_event_index').on(
      table.provider,
      table.providerEventId,
    ),
    index('commerce_provider_events_status_received_at_index').on(table.status, table.receivedAt),
    index('commerce_provider_events_status_next_attempt_index').on(
      table.status,
      table.nextAttemptAt,
    ),
  ],
)
