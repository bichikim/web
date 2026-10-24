import {and, desc, eq, gt, isNotNull, isNull, sql} from 'drizzle-orm'

import {
  getDatabase,
  pomoAccountLinkAttemptLimits,
  pomoAccountLinkChallenges,
  pomoAppSessions,
  pomoIdentities,
  pomoUsers,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../../database'
import {getAccountLinkAttemptDecision} from './account-link-attempt-limit'

const MILLISECONDS_PER_SECOND = 1000
const LINK_CHALLENGE_COOLDOWN_SECONDS = 60

export type CompleteAccountLinkResult =
  | {readonly status: 'identity-conflict'}
  | {readonly status: 'invalid-challenge'}
  | {readonly status: 'linked'; readonly userId: string}

type AppSessionActivation = 'active' | 'pending'

export interface SaveTossAppSessionInput {
  readonly activation: AppSessionActivation
  readonly expiresAt: Date
  readonly now: Date
  readonly providerSubject: string
  readonly tokenHash: string
}

export interface ActivatePendingAppSessionInput {
  readonly expiresAt: Date
  readonly now: Date
  readonly tokenHash: string
}

export interface SaveAccountLinkChallengeInput {
  readonly emailHash: string
  readonly expiresAt: Date
  readonly now: Date
  readonly tokenHash: string
  readonly userId: string
}

export type SaveAccountLinkChallengeResult =
  | {readonly status: 'created'}
  | {readonly retryAfterSeconds: number; readonly status: 'rate-limited'}

export interface ConsumeAccountLinkChallengeInput {
  readonly emailHash: string
  readonly neonSubject: string
  readonly now: Date
  readonly tokenHash: string
}

type UserAuthTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

interface RateLimitedAccountLinkChallenge {
  readonly retryAfterSeconds: number
  readonly status: 'rate-limited'
}

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

const recordAccountLinkAttempt = async (
  database: UserAuthTransaction,
  userId: string,
  now: Date,
): Promise<RateLimitedAccountLinkChallenge | null> => {
  const [currentWindow] = await database
    .select({
      attemptCount: pomoAccountLinkAttemptLimits.attemptCount,
      windowStartedAt: pomoAccountLinkAttemptLimits.windowStartedAt,
    })
    .from(pomoAccountLinkAttemptLimits)
    .where(eq(pomoAccountLinkAttemptLimits.userId, userId))
    .limit(1)
  const decision = getAccountLinkAttemptDecision(currentWindow, now)

  if (decision.status === 'rate-limited') {
    return decision
  }

  await database
    .insert(pomoAccountLinkAttemptLimits)
    .values({
      attemptCount: decision.attemptCount,
      userId,
      windowStartedAt: decision.windowStartedAt,
    })
    .onConflictDoUpdate({
      set: {
        attemptCount: decision.attemptCount,
        windowStartedAt: decision.windowStartedAt,
      },
      target: pomoAccountLinkAttemptLimits.userId,
    })

  return null
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

export const saveTossAppSession = async (
  input: SaveTossAppSessionInput,
): Promise<{readonly userId: string}> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const userId = await findOrCreateUser(transaction, 'toss', input.providerSubject)

      await transaction.insert(pomoAppSessions).values({
        activatedAt: input.activation === 'active' ? input.now : null,
        expiresAt: input.expiresAt,
        tokenHash: input.tokenHash,
        userId,
      })

      return {userId}
    }),
  )

export const findAppSessionUserId = async (
  tokenHash: string,
  now: Date = new Date(),
): Promise<string | null> => {
  const [session] = await getDatabase()
    .select({userId: pomoAppSessions.userId})
    .from(pomoAppSessions)
    .where(
      and(
        eq(pomoAppSessions.tokenHash, tokenHash),
        isNotNull(pomoAppSessions.activatedAt),
        isNull(pomoAppSessions.revokedAt),
        gt(pomoAppSessions.expiresAt, now),
      ),
    )
    .limit(1)

  return session?.userId ?? null
}

export const activatePendingAppSession = async (
  input: ActivatePendingAppSessionInput,
): Promise<string | null> => {
  const [activatedSession] = await getDatabase()
    .update(pomoAppSessions)
    .set({activatedAt: input.now, expiresAt: input.expiresAt})
    .where(
      and(
        eq(pomoAppSessions.tokenHash, input.tokenHash),
        isNull(pomoAppSessions.activatedAt),
        isNull(pomoAppSessions.revokedAt),
        gt(pomoAppSessions.expiresAt, input.now),
      ),
    )
    .returning({userId: pomoAppSessions.userId})

  return activatedSession?.userId ?? null
}

export const revokeAppSessionRecord = async (
  tokenHash: string,
  now: Date = new Date(),
): Promise<void> => {
  await withTransactionalDatabase((database) =>
    database
      .update(pomoAppSessions)
      .set({revokedAt: now})
      .where(and(eq(pomoAppSessions.tokenHash, tokenHash), isNull(pomoAppSessions.revokedAt))),
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

export const saveAccountLinkChallenge = async (
  input: SaveAccountLinkChallengeInput,
): Promise<SaveAccountLinkChallengeResult> => {
  const cooldownStart = new Date(
    input.now.getTime() - LINK_CHALLENGE_COOLDOWN_SECONDS * MILLISECONDS_PER_SECOND,
  )

  return withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockTransactionKey(transaction, `account-link:${input.userId}`)

      const [recentChallenge] = await transaction
        .select({createdAt: pomoAccountLinkChallenges.createdAt})
        .from(pomoAccountLinkChallenges)
        .where(
          and(
            eq(pomoAccountLinkChallenges.userId, input.userId),
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
            Math.ceil((retryAt - input.now.getTime()) / MILLISECONDS_PER_SECOND),
          ),
          status: 'rate-limited',
        }
      }

      const attemptLimit = await recordAccountLinkAttempt(transaction, input.userId, input.now)

      if (attemptLimit !== null) {
        return attemptLimit
      }

      await transaction
        .delete(pomoAccountLinkChallenges)
        .where(eq(pomoAccountLinkChallenges.userId, input.userId))
      await transaction.insert(pomoAccountLinkChallenges).values({
        emailHash: input.emailHash,
        expiresAt: input.expiresAt,
        tokenHash: input.tokenHash,
        userId: input.userId,
      })

      return {status: 'created'}
    }),
  )
}

export const deleteAccountLinkChallenge = async (tokenHash: string): Promise<void> => {
  await withTransactionalDatabase((database) =>
    database
      .delete(pomoAccountLinkChallenges)
      .where(eq(pomoAccountLinkChallenges.tokenHash, tokenHash)),
  )
}

export const consumeAccountLinkChallenge = async (
  input: ConsumeAccountLinkChallengeInput,
): Promise<CompleteAccountLinkResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockIdentity(transaction, 'neon', input.neonSubject)

      const [challenge] = await transaction
        .select({id: pomoAccountLinkChallenges.id, userId: pomoAccountLinkChallenges.userId})
        .from(pomoAccountLinkChallenges)
        .where(
          and(
            eq(pomoAccountLinkChallenges.tokenHash, input.tokenHash),
            eq(pomoAccountLinkChallenges.emailHash, input.emailHash),
            isNull(pomoAccountLinkChallenges.consumedAt),
            gt(pomoAccountLinkChallenges.expiresAt, input.now),
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
          and(
            eq(pomoIdentities.provider, 'neon'),
            eq(pomoIdentities.providerSubject, input.neonSubject),
          ),
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
          providerSubject: input.neonSubject,
          userId: challenge.userId,
        })
      }

      await transaction
        .update(pomoAccountLinkChallenges)
        .set({consumedAt: input.now})
        .where(eq(pomoAccountLinkChallenges.id, challenge.id))

      return {status: 'linked', userId: challenge.userId}
    }),
  )

export const findOrCreateNeonUser = async (neonSubject: string): Promise<string> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) => findOrCreateUser(transaction, 'neon', neonSubject)),
  )
