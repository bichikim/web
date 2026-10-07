import {sql} from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import {pomoUsers} from './users'
import {commerceProducts} from './commerce'

export const cloudTextRequests = pgTable(
  'cloud_text_requests',
  {
    day: date().notNull(),
    expiresAt: timestamp({withTimezone: true}).notNull(),
    id: uuid().primaryKey(),
    requestHash: varchar({length: 64}).notNull(),
    result: text(),
    status: varchar({enum: ['pending', 'complete', 'failed'], length: 16}).notNull(),
    tokenCount: integer().notNull().default(0),
    usageResetAt: timestamp({withTimezone: true}),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    index('cloud_text_requests_user_day_index').on(table.userId, table.day),
    check('cloud_text_requests_token_count_check', sql`${table.tokenCount} >= 0`),
    check(
      'cloud_text_requests_status_check',
      sql`${table.status} in ('pending', 'complete', 'failed')`,
    ),
    check(
      'cloud_text_requests_result_check',
      sql`(${table.status} = 'complete') = (${table.result} is not null)`,
    ),
  ],
)

export const cloudTextLimits = pgTable(
  'cloud_text_limits',
  {
    dailyLimit: integer(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid()
      .primaryKey()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    check(
      'cloud_text_limits_daily_limit_check',
      sql`${table.dailyLimit} >= 0 and ${table.dailyLimit} <= 10000`,
    ),
  ],
)

export const cloudTextProductLimits = pgTable(
  'cloud_text_product_limits',
  {
    dailyLimit: integer(),
    productId: uuid()
      .primaryKey()
      .references(() => commerceProducts.id, {onDelete: 'cascade'}),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (table) => [
    check(
      'cloud_text_product_limits_daily_limit_check',
      sql`${table.dailyLimit} is null or ${table.dailyLimit} between 0 and 10000`,
    ),
  ],
)
