import {and, eq, gt, sql} from 'drizzle-orm'

import {
  calendarConnections,
  calendarOauthStates,
  calendarProviderEnum,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'

export type CalendarProviderId = (typeof calendarProviderEnum.enumValues)[number]

export interface CalendarConnectionRecord {
  readonly accountLabel: string
  readonly encryptedTokens: string
  readonly id: string
  readonly provider: CalendarProviderId
}

interface CalendarOauthState {
  readonly codeVerifier: string
  readonly redirectUri: string
  readonly userId: string
}

interface CreateOauthStateOptions {
  readonly codeVerifier: string
  readonly expiresAt: Date
  readonly provider: CalendarProviderId
  readonly redirectUri: string
  readonly stateHash: string
  readonly userId: string
}

interface SaveCalendarConnectionOptions {
  readonly accountLabel: string
  readonly encryptedTokens: string
  readonly provider: CalendarProviderId
  readonly providerSubject: string
  readonly userId: string
}

export interface CalendarRepository {
  readonly consumeOauthState: (
    provider: CalendarProviderId,
    stateHash: string,
    now: Date,
  ) => Promise<CalendarOauthState | null>
  readonly createOauthState: (options: CreateOauthStateOptions) => Promise<void>
  readonly deleteConnection: (userId: string, connectionId: string) => Promise<boolean>
  readonly listConnections: (userId: string) => Promise<ReadonlyArray<CalendarConnectionRecord>>
  readonly saveConnection: (options: SaveCalendarConnectionOptions) => Promise<void>
  readonly withLockedTokens: (
    connectionId: string,
    operation: (encryptedTokens: string) => Promise<string>,
  ) => Promise<string>
}

export const calendarRepository: CalendarRepository = {
  consumeOauthState: async (provider, stateHash, now) => {
    const [oauthState] = await getDatabase()
      .delete(calendarOauthStates)
      .where(
        and(
          eq(calendarOauthStates.provider, provider),
          eq(calendarOauthStates.stateHash, stateHash),
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
    await getDatabase().insert(calendarOauthStates).values(options)
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
