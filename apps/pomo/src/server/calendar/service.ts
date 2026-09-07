import type {CalendarEvent, CalendarEventRange, CalendarProviderId} from 'src/features/calendar'

import type {CalendarProvider, CalendarProviderTokens} from './providers/types'
import type {TokenVault} from './token-vault'

const TOKEN_REFRESH_LEEWAY_MILLISECONDS = 60_000

export interface CalendarConnectionRecord {
  readonly accountLabel: string
  readonly encryptedTokens: string
  readonly id: string
  readonly provider: CalendarProviderId
}

export interface CalendarConnectionSummary {
  readonly accountLabel: string
  readonly id: string
  readonly provider: CalendarProviderId
}

interface CalendarOauthState {
  readonly codeVerifier: string
  readonly redirectUri: string
  readonly userId: string
}

interface CreateOauthStateOptions {
  readonly provider: CalendarProviderId
  readonly redirectUri: string
  readonly userId: string
}

interface CreatedOauthState {
  readonly codeChallenge: string
  readonly state: string
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
    state: string,
    now: Date,
  ) => Promise<CalendarOauthState | null>
  readonly createOauthState: (options: CreateOauthStateOptions) => Promise<CreatedOauthState>
  readonly deleteConnection: (userId: string, connectionId: string) => Promise<boolean>
  readonly listConnections: (userId: string) => Promise<ReadonlyArray<CalendarConnectionRecord>>
  readonly saveConnection: (options: SaveCalendarConnectionOptions) => Promise<void>
  readonly withLockedTokens: (
    connectionId: string,
    operation: (encryptedTokens: string) => Promise<string>,
  ) => Promise<string>
}

interface CreateCalendarServiceOptions {
  readonly now?: () => Date
  readonly providerFor: (provider: CalendarProviderId) => CalendarProvider
  readonly repository: CalendarRepository
  readonly vault: TokenVault
}

interface BeginCalendarConnectionOptions {
  readonly provider: CalendarProviderId
  readonly redirectUri: string
  readonly userId: string
}

interface CompleteCalendarConnectionOptions {
  readonly code: string
  readonly provider: CalendarProviderId
  readonly state: string
}

interface ListCalendarEventsOptions extends CalendarEventRange {
  readonly userId: string
}

interface ConnectionEventsResult {
  readonly events: ReadonlyArray<CalendarEvent>
  readonly truncated: boolean
}

export interface CalendarEventsResult extends ConnectionEventsResult {
  readonly connectedConnections: number
  readonly events: ReadonlyArray<CalendarEvent>
  readonly unavailableConnections: number
}

export interface CalendarService {
  readonly beginConnection: (options: BeginCalendarConnectionOptions) => Promise<string>
  readonly completeConnection: (options: CompleteCalendarConnectionOptions) => Promise<boolean>
  readonly deleteConnection: (userId: string, connectionId: string) => Promise<boolean>
  readonly listConnections: (userId: string) => Promise<ReadonlyArray<CalendarConnectionSummary>>
  readonly listEvents: (options: ListCalendarEventsOptions) => Promise<CalendarEventsResult>
}

const shouldRefresh = (tokens: CalendarProviderTokens, now: Date) =>
  tokens.expiresAt !== null &&
  new Date(tokens.expiresAt).getTime() <= now.getTime() + TOKEN_REFRESH_LEEWAY_MILLISECONDS

export const createCalendarService = (options: CreateCalendarServiceOptions): CalendarService => {
  const now = options.now ?? (() => new Date())

  const readConnectionEvents = async (
    connection: CalendarConnectionRecord,
    range: CalendarEventRange,
  ): Promise<ConnectionEventsResult> => {
    const provider = options.providerFor(connection.provider)
    let tokens = options.vault.open(connection.encryptedTokens)

    if (shouldRefresh(tokens, now())) {
      const encryptedTokens = await options.repository.withLockedTokens(
        connection.id,
        async (currentEncryptedTokens) => {
          const currentTokens = options.vault.open(currentEncryptedTokens)

          if (!shouldRefresh(currentTokens, now())) {
            return currentEncryptedTokens
          }

          if (currentTokens.refreshToken === null) {
            throw new Error('Calendar connection requires authorization')
          }

          const refreshedTokens = await provider.refreshTokens(currentTokens.refreshToken)
          return options.vault.seal(refreshedTokens)
        },
      )
      tokens = options.vault.open(encryptedTokens)
    }

    const result = await provider.listEvents({accessToken: tokens.accessToken, ...range})
    return {
      events: result.events.map((event) => ({
        ...event,
        accountLabel: connection.accountLabel,
        id: `${connection.id}:${event.id}`,
        provider: connection.provider,
      })),
      truncated: result.truncated,
    }
  }

  return {
    beginConnection: async (beginOptions) => {
      const challenge = await options.repository.createOauthState(beginOptions)
      return options.providerFor(beginOptions.provider).createAuthorizationUrl({
        ...challenge,
        redirectUri: beginOptions.redirectUri,
      })
    },
    completeConnection: async (completeOptions) => {
      const oauthState = await options.repository.consumeOauthState(
        completeOptions.provider,
        completeOptions.state,
        now(),
      )

      if (oauthState === null) {
        return false
      }

      const provider = options.providerFor(completeOptions.provider)
      const tokens = await provider.exchangeCode({
        code: completeOptions.code,
        codeVerifier: oauthState.codeVerifier,
        redirectUri: oauthState.redirectUri,
      })
      const account = await provider.readAccount(tokens.accessToken)
      await options.repository.saveConnection({
        accountLabel: account.label,
        encryptedTokens: options.vault.seal(tokens),
        provider: completeOptions.provider,
        providerSubject: account.subject,
        userId: oauthState.userId,
      })
      return true
    },
    deleteConnection: options.repository.deleteConnection,
    listConnections: async (userId) =>
      (await options.repository.listConnections(userId)).map((connection) => ({
        accountLabel: connection.accountLabel,
        id: connection.id,
        provider: connection.provider,
      })),
    listEvents: async (listOptions) => {
      const {userId, ...range} = listOptions
      const connections = await options.repository.listConnections(userId)
      const results = await Promise.allSettled(
        connections.map((connection) => readConnectionEvents(connection, range)),
      )
      const events = results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value.events : []))
        .sort((left, right) => left.start.localeCompare(right.start))

      return {
        connectedConnections: connections.length,
        events,
        truncated: results.some(
          (result) => result.status === 'fulfilled' && result.value.truncated,
        ),
        unavailableConnections: results.filter((result) => result.status === 'rejected').length,
      }
    },
  }
}
