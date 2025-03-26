import {boolean, integer, pgTable, primaryKey, text, timestamp} from 'drizzle-orm/pg-core'
import {relations} from 'drizzle-orm'
import {timestamps} from '../fragments'
import {musicPosts} from './music-posts'
import type {AdapterAccountType} from '@auth/core/adapters'

export const users = pgTable('users', {
  age: integer(),
  email: text().unique(),
  emailVerified: timestamp('emailVerified', {mode: 'date'}),
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  image: text(),
  name: text(),
  ...timestamps,
})

export const usersRelations = relations(users, ({many}) => ({
  posts: many(musicPosts),
}))

export const accounts = pgTable(
  'accounts',
  {
    // eslint-disable-next-line camelcase
    access_token: text('access_token'),
    // eslint-disable-next-line camelcase
    expires_at: integer('expires_at'),
    // eslint-disable-next-line camelcase
    id_token: text('id_token'),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    // eslint-disable-next-line camelcase
    refresh_token: text('refresh_token'),
    scope: text('scope'),
    // eslint-disable-next-line camelcase
    session_state: text('session_state'),
    // eslint-disable-next-line camelcase
    token_type: text('token_type'),
    type: text().$type<AdapterAccountType>().notNull(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
  },
  (account) => [
    {
      compoundKey: primaryKey({columns: [account.provider, account.providerAccountId]}),
    },
  ],
)

export const sessions = pgTable('sessions', {
  expires: timestamp('expires', {mode: 'date'}).notNull(),
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, {onDelete: 'cascade'}),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    expires: timestamp('expires', {mode: 'date'}).notNull(),
    identifier: text('identifier').notNull(),
    token: text('token').notNull().unique(),
  },
  (verificationToken) => [
    {
      compositePK: primaryKey({
        columns: [verificationToken.identifier, verificationToken.token],
      }),
    },
  ],
)

export const authenticators = pgTable(
  'authenticators',
  {
    counter: integer('counter').notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialID: text('credentialID').notNull().unique(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    providerId: text('providerId').notNull(),
    transports: text('transports'),
    userId: text('userId')
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
  },
  (authenticator) => [
    {
      compositePK: primaryKey({
        columns: [authenticator.userId, authenticator.credentialID],
      }),
    },
  ],
)
