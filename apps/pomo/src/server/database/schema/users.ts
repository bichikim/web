import {sql} from 'drizzle-orm'
import {index, pgEnum, pgTable, timestamp, uniqueIndex, uuid, varchar} from 'drizzle-orm/pg-core'

export const pomoIdentityProviderEnum = pgEnum('pomo_identity_provider', ['neon', 'toss'])

export const pomoUsers = pgTable('pomo_users', {
  createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  deletedAt: timestamp({withTimezone: true}),
  id: uuid().primaryKey().defaultRandom(),
  updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
})

export const pomoIdentities = pgTable(
  'pomo_identities',
  {
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    id: uuid().primaryKey().defaultRandom(),
    provider: pomoIdentityProviderEnum().notNull(),
    providerSubject: varchar({length: 255}).notNull(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    uniqueIndex('pomo_identities_provider_subject_index').on(table.provider, table.providerSubject),
    uniqueIndex('pomo_identities_user_provider_index').on(table.userId, table.provider),
  ],
)

export const pomoAppSessions = pgTable(
  'pomo_app_sessions',
  {
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    expiresAt: timestamp({withTimezone: true}).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    lastUsedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    revokedAt: timestamp({withTimezone: true}),
    tokenHash: varchar({length: 64}).notNull(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    uniqueIndex('pomo_app_sessions_token_hash_index').on(table.tokenHash),
    index('pomo_app_sessions_expiry_index').on(table.expiresAt),
    index('pomo_app_sessions_revoked_index')
      .on(table.revokedAt)
      .where(sql`${table.revokedAt} is not null`),
    index('pomo_app_sessions_user_expiry_index').on(table.userId, table.expiresAt),
  ],
)

export const pomoAccountLinkChallenges = pgTable(
  'pomo_account_link_challenges',
  {
    consumedAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    emailHash: varchar({length: 64}).notNull(),
    expiresAt: timestamp({withTimezone: true}).notNull(),
    id: uuid().primaryKey().defaultRandom(),
    tokenHash: varchar({length: 64}).notNull(),
    userId: uuid()
      .notNull()
      .references(() => pomoUsers.id, {onDelete: 'cascade'}),
  },
  (table) => [
    uniqueIndex('pomo_account_link_challenges_token_hash_index').on(table.tokenHash),
    index('pomo_account_link_challenges_expiry_index').on(table.expiresAt),
  ],
)
