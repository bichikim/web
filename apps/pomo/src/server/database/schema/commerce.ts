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
    billingType: commerceOfferBillingTypeEnum().notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    externalProductId: varchar({length: 255}).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => commerceProducts.id, {onDelete: 'restrict'}),
    provider: varchar({length: 64}).notNull(),
    status: commerceOfferStatusEnum().notNull().default('inactive'),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
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
    providerOrderId: varchar({length: 255}).notNull(),
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
    index('commerce_orders_user_created_at_index').on(table.userId, table.createdAt),
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
    errorCode: varchar({length: 64}),
    eventType: varchar({length: 128}).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    payload: jsonb().$type<Readonly<Record<string, unknown>>>().notNull(),
    processedAt: timestamp({withTimezone: true}),
    provider: varchar({length: 64}).notNull(),
    providerEventId: varchar({length: 255}).notNull(),
    receivedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    status: commerceProviderEventStatusEnum().notNull().default('received'),
  },
  (table) => [
    uniqueIndex('commerce_provider_events_provider_event_index').on(
      table.provider,
      table.providerEventId,
    ),
    index('commerce_provider_events_status_received_at_index').on(table.status, table.receivedAt),
  ],
)
