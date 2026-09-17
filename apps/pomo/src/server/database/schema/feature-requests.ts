import {sql} from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import {pomoUsers} from './users'

export const featureRequestStatusEnum = pgEnum('feature_request_status', [
  'requested',
  'voting',
  'confirmed',
  'completed',
])

export const featureRequests = pgTable(
  'feature_requests',
  {
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    description: text().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    status: featureRequestStatusEnum().notNull().default('requested'),
    targetVoteCount: integer(),
    title: varchar({length: 120}).notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    check(
      'feature_requests_target_vote_count_check',
      sql`${table.targetVoteCount} is null or ${table.targetVoteCount} > 0`,
    ),
    index('feature_requests_status_created_at_index').on(table.status, table.createdAt),
  ],
)

export const featureRequestVotes = pgTable(
  'feature_request_votes',
  {
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    requestId: uuid()
      .notNull()
      .references(() => featureRequests.id, {onDelete: 'cascade'}),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    primaryKey({columns: [table.requestId, table.userId]}),
    index('feature_request_votes_user_index').on(table.userId),
  ],
)
