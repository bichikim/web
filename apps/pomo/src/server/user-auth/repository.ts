import 'server-only'

import {and, desc, eq, gt, isNull, sql} from 'drizzle-orm'

import {
  pomoAccountLinkChallenges,
  pomoAppSessions,
  pomoIdentities,
  pomoUsers,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../database'
import {createOpaqueToken, hashOpaqueToken} from './token'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const APP_SESSION_DAYS = 30
const LINK_CHALLENGE_MINUTES = 30
const LINK_CHALLENGE_COOLDOWN_SECONDS = 60
const APP_SESSION_LIFETIME =
  APP_SESSION_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const LINK_CHALLENGE_LIFETIME =
  LINK_CHALLENGE_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface AppSession {
  readonly expiresAt: Date
  readonly token: string
  readonly userId: string
}

interface CreatedAccountLinkChallenge {
  readonly expiresAt: Date
  readonly status: 'created'
  readonly token: string
}

interface RateLimitedAccountLinkChallenge {
  readonly retryAfterSeconds: number
  readonly status: 'rate-limited'
}

export type CreateAccountLinkChallengeResult =
  | CreatedAccountLinkChallenge
  | RateLimitedAccountLinkChallenge

export type CompleteAccountLinkResult =
  | {readonly status: 'linked'; readonly userId: string}
  | {readonly status: 'invalid-challenge'}
  | {readonly status: 'identity-conflict'}

interface ClockAndToken {
  readonly createToken: () => string
  readonly now: () => Date
}

type UserAuthTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

const DEFAULT_CLOCK_AND_TOKEN: ClockAndToken = {
  createToken: createOpaqueToken,
  now: () => new Date(),
}

const normalizeEmailAddress = (email: string): string => email.trim().toLowerCase()

const lockTransactionKey = async (database: UserAuthTransaction, key: string): Promise<void> => {
  await database.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)
}

const lockIdentity = async (
  database: UserAuthTransaction,
  provider: 'neon' | 'toss',
  providerSubject: string,
): Promise<void> => {
  await lockTransactionKey(database, `${provider}:${providerSubject}`)
}

const findOrCreateUser = async (
  database: UserAuthTransaction,
  provider: 'neon' | 'toss',
  providerSubject: string,
): Promise<string> => {
  await lockIdentity(database, provider, providerSubject)

  const [existingIdentity] = await database
    .select({userId: pomoIdentities.userId})
    .from(pomoIdentities)
    .where(
      and(
        eq(pomoIdentities.provider, provider),
        eq(pomoIdentities.providerSubject, providerSubject),
      ),
    )
    .limit(1)

  if (existingIdentity !== undefined) {
    return existingIdentity.userId
  }

  const [user] = await database.insert(pomoUsers).values({}).returning({id: pomoUsers.id})

  if (user === undefined) {
    throw new Error('Failed to create a Pomo user')
  }

  await database.insert(pomoIdentities).values({
    provider,
    providerSubject,
    userId: user.id,
  })

  return user.id
}

export const createTossAppSession = async (
  providerSubject: string,
  dependencies: ClockAndToken = DEFAULT_CLOCK_AND_TOKEN,
): Promise<AppSession> => {
  const token = dependencies.createToken()
  const now = dependencies.now()
  const expiresAt = new Date(now.getTime() + APP_SESSION_LIFETIME)

  return withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const userId = await findOrCreateUser(transaction, 'toss', providerSubject)

      await transaction.insert(pomoAppSessions).values({
        expiresAt,
        tokenHash: hashOpaqueToken(token),
        userId,
      })

      return {expiresAt, token, userId}
    }),
  )
}

export const getAppSessionUserId = async (
  token: string,
  now: Date = new Date(),
): Promise<string | null> => {
  const tokenHash = hashOpaqueToken(token)

  return withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [session] = await transaction
        .select({id: pomoAppSessions.id, userId: pomoAppSessions.userId})
        .from(pomoAppSessions)
        .where(
          and(
            eq(pomoAppSessions.tokenHash, tokenHash),
            isNull(pomoAppSessions.revokedAt),
            gt(pomoAppSessions.expiresAt, now),
          ),
        )
        .limit(1)

      if (session === undefined) {
        return null
      }

      await transaction
        .update(pomoAppSessions)
        .set({lastUsedAt: now})
        .where(eq(pomoAppSessions.id, session.id))

      return session.userId
    }),
  )
}

export const revokeAppSession = async (token: string, now: Date = new Date()): Promise<void> => {
  await withTransactionalDatabase((database) =>
    database
      .update(pomoAppSessions)
      .set({revokedAt: now})
      .where(
        and(
          eq(pomoAppSessions.tokenHash, hashOpaqueToken(token)),
          isNull(pomoAppSessions.revokedAt),
        ),
      ),
  )
}

export const revokeTossAppSessions = async (
  providerSubject: string,
  now: Date = new Date(),
): Promise<void> => {
  await withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockIdentity(transaction, 'toss', providerSubject)

      const [identity] = await transaction
        .select({userId: pomoIdentities.userId})
        .from(pomoIdentities)
        .where(
          and(
            eq(pomoIdentities.provider, 'toss'),
            eq(pomoIdentities.providerSubject, providerSubject),
          ),
        )
        .limit(1)

      if (identity === undefined) {
        return
      }

      await transaction
        .update(pomoAppSessions)
        .set({revokedAt: now})
        .where(and(eq(pomoAppSessions.userId, identity.userId), isNull(pomoAppSessions.revokedAt)))
    }),
  )
}

export const createAccountLinkChallenge = async (
  userId: string,
  email: string,
  dependencies: ClockAndToken = DEFAULT_CLOCK_AND_TOKEN,
): Promise<CreateAccountLinkChallengeResult> => {
  const token = dependencies.createToken()
  const now = dependencies.now()
  const expiresAt = new Date(now.getTime() + LINK_CHALLENGE_LIFETIME)
  const cooldownStart = new Date(
    now.getTime() - LINK_CHALLENGE_COOLDOWN_SECONDS * MILLISECONDS_PER_SECOND,
  )

  return withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockTransactionKey(transaction, `account-link:${userId}`)

      const [recentChallenge] = await transaction
        .select({createdAt: pomoAccountLinkChallenges.createdAt})
        .from(pomoAccountLinkChallenges)
        .where(
          and(
            eq(pomoAccountLinkChallenges.userId, userId),
            gt(pomoAccountLinkChallenges.createdAt, cooldownStart),
          ),
        )
        .orderBy(desc(pomoAccountLinkChallenges.createdAt))
        .limit(1)

      if (recentChallenge !== undefined) {
        const retryAt =
          recentChallenge.createdAt.getTime() +
          LINK_CHALLENGE_COOLDOWN_SECONDS * MILLISECONDS_PER_SECOND

        return {
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((retryAt - now.getTime()) / MILLISECONDS_PER_SECOND),
          ),
          status: 'rate-limited',
        }
      }

      await transaction
        .delete(pomoAccountLinkChallenges)
        .where(eq(pomoAccountLinkChallenges.userId, userId))
      await transaction.insert(pomoAccountLinkChallenges).values({
        emailHash: hashOpaqueToken(normalizeEmailAddress(email)),
        expiresAt,
        tokenHash: hashOpaqueToken(token),
        userId,
      })

      return {expiresAt, status: 'created', token}
    }),
  )
}

export const completeAccountLink = async (
  token: string,
  neonSubject: string,
  neonEmail: string,
  now: Date = new Date(),
): Promise<CompleteAccountLinkResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const tokenHash = hashOpaqueToken(token)
      await lockIdentity(transaction, 'neon', neonSubject)

      const [challenge] = await transaction
        .select({id: pomoAccountLinkChallenges.id, userId: pomoAccountLinkChallenges.userId})
        .from(pomoAccountLinkChallenges)
        .where(
          and(
            eq(pomoAccountLinkChallenges.tokenHash, tokenHash),
            eq(
              pomoAccountLinkChallenges.emailHash,
              hashOpaqueToken(normalizeEmailAddress(neonEmail)),
            ),
            isNull(pomoAccountLinkChallenges.consumedAt),
            gt(pomoAccountLinkChallenges.expiresAt, now),
          ),
        )
        .limit(1)

      if (challenge === undefined) {
        return {status: 'invalid-challenge'}
      }

      const [existingIdentity] = await transaction
        .select({userId: pomoIdentities.userId})
        .from(pomoIdentities)
        .where(
          and(eq(pomoIdentities.provider, 'neon'), eq(pomoIdentities.providerSubject, neonSubject)),
        )
        .limit(1)

      if (existingIdentity !== undefined && existingIdentity.userId !== challenge.userId) {
        return {status: 'identity-conflict'}
      }

      if (existingIdentity === undefined) {
        const [userIdentity] = await transaction
          .select({id: pomoIdentities.id})
          .from(pomoIdentities)
          .where(
            and(eq(pomoIdentities.provider, 'neon'), eq(pomoIdentities.userId, challenge.userId)),
          )
          .limit(1)

        if (userIdentity !== undefined) {
          return {status: 'identity-conflict'}
        }

        await transaction.insert(pomoIdentities).values({
          provider: 'neon',
          providerSubject: neonSubject,
          userId: challenge.userId,
        })
      }

      await transaction
        .update(pomoAccountLinkChallenges)
        .set({consumedAt: now})
        .where(eq(pomoAccountLinkChallenges.id, challenge.id))

      return {status: 'linked', userId: challenge.userId}
    }),
  )

export const findOrCreateNeonUser = async (neonSubject: string): Promise<string> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) => findOrCreateUser(transaction, 'neon', neonSubject)),
  )
