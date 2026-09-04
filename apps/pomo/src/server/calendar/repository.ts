import {createHash} from 'node:crypto'
import {and, eq, gt, sql} from 'drizzle-orm'

import {
  calendarConnections,
  calendarOauthStates,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'
import {createOpaqueToken, hashOpaqueToken} from 'src/server/user-auth/token'

import type {CalendarRepository} from './service'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const OAUTH_STATE_LIFETIME_MINUTES = 10
const OAUTH_STATE_LIFETIME_MILLISECONDS =
  OAUTH_STATE_LIFETIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

const createCodeChallenge = (codeVerifier: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url')

export const calendarRepository: CalendarRepository = {
  consumeOauthState: async (provider, state, now) => {
    const [oauthState] = await getDatabase()
      .delete(calendarOauthStates)
      .where(
        and(
          eq(calendarOauthStates.provider, provider),
          eq(calendarOauthStates.stateHash, hashOpaqueToken(state)),
          gt(calendarOauthStates.expiresAt, now),
        ),
      )
      .returning({
        codeVerifier: calendarOauthStates.codeVerifier,
        redirectUri: calendarOauthStates.redirectUri,
        userId: calendarOauthStates.userId,
      })

    return oauthState ?? null
  },
  createOauthState: async (options) => {
    const state = createOpaqueToken()
    const codeVerifier = createOpaqueToken()
    const expiresAt = new Date(Date.now() + OAUTH_STATE_LIFETIME_MILLISECONDS)
    await getDatabase()
      .insert(calendarOauthStates)
      .values({
        codeVerifier,
        expiresAt,
        provider: options.provider,
        redirectUri: options.redirectUri,
        stateHash: hashOpaqueToken(state),
        userId: options.userId,
      })
    return {codeChallenge: createCodeChallenge(codeVerifier), state}
  },
  deleteConnection: async (userId, connectionId) => {
    const deleted = await getDatabase()
      .delete(calendarConnections)
      .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.userId, userId)))
      .returning({id: calendarConnections.id})
    return deleted.length > 0
  },
  listConnections: (userId) =>
    getDatabase()
      .select({
        accountLabel: calendarConnections.accountLabel,
        encryptedTokens: calendarConnections.encryptedTokens,
        id: calendarConnections.id,
        provider: calendarConnections.provider,
      })
      .from(calendarConnections)
      .where(eq(calendarConnections.userId, userId)),
  saveConnection: async (options) => {
    await getDatabase()
      .insert(calendarConnections)
      .values(options)
      .onConflictDoUpdate({
        set: {
          accountLabel: options.accountLabel,
          encryptedTokens: options.encryptedTokens,
          updatedAt: new Date(),
        },
        target: [
          calendarConnections.userId,
          calendarConnections.provider,
          calendarConnections.providerSubject,
        ],
      })
  },
  withLockedTokens: (connectionId, operation) => {
    const lockKey = `calendar:${connectionId}`
    return withTransactionalDatabase((database) =>
      database.transaction(async (transaction) => {
        await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`)
        const [connection] = await transaction
          .select({encryptedTokens: calendarConnections.encryptedTokens})
          .from(calendarConnections)
          .where(eq(calendarConnections.id, connectionId))
          .limit(1)

        if (connection === undefined) {
          throw new Error('Calendar connection no longer exists')
        }

        const encryptedTokens = await operation(connection.encryptedTokens)
        if (encryptedTokens !== connection.encryptedTokens) {
          await transaction
            .update(calendarConnections)
            .set({encryptedTokens, updatedAt: new Date()})
            .where(eq(calendarConnections.id, connectionId))
        }

        return encryptedTokens
      }),
    )
  },
}
