import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import {pomoUsers} from './users'

export const calendarProviderEnum = pgEnum('calendar_provider', ['google', 'microsoft'])

export const calendarConnections = pgTable(
  'calendar_connections',
  {
    accountLabel: varchar({length: 255}).notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    encryptedTokens: text().notNull(),
    id: uuid().primaryKey().defaultRandom(),
    provider: calendarProviderEnum().notNull(),
    providerSubject: varchar({length: 255}).notNull(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    uniqueIndex('calendar_connections_user_provider_subject_index').on(
      table.userId,
      table.provider,
      table.providerSubject,
    ),
    index('calendar_connections_user_index').on(table.userId),
  ],
)

export const calendarOauthStates = pgTable(
  'calendar_oauth_states',
  {
    codeVerifier: varchar({length: 128}).notNull(),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    expiresAt: timestamp({withTimezone: true}).notNull(),
    provider: calendarProviderEnum().notNull(),
    redirectUri: varchar({length: 2048}).notNull(),
    stateHash: varchar({length: 64}).notNull(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    primaryKey({columns: [table.stateHash, table.provider]}),
    index('calendar_oauth_states_expiry_index').on(table.expiresAt),
  ],
)
