import type {CalendarEvent, CalendarEventRange, CalendarProviderId} from 'src/features/calendar'
import {createOpaqueToken, hashOpaqueToken} from 'src/server/utils/token'

import type {CalendarConnectionRecord, CalendarRepository} from '../repositories/calendar'
import {createCodeChallenge} from './create-code-challenge'
import type {CalendarProvider, CalendarProviderTokens} from './providers/types'
import type {TokenVault} from './token-vault'

const TOKEN_REFRESH_LEEWAY_MILLISECONDS = 60_000
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const OAUTH_STATE_LIFETIME_MINUTES = 10
const OAUTH_STATE_LIFETIME_MILLISECONDS =
  OAUTH_STATE_LIFETIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface CalendarConnectionSummary {
  readonly accountLabel: string
  readonly id: string
  readonly provider: CalendarProviderId
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
  readonly displayTimeZone: string
  readonly userId: string
}

interface ConnectionEventsResult {
  readonly events: ReadonlyArray<CalendarEvent>
  readonly truncated: boolean
}

interface ProviderConnectionEventsResult extends ConnectionEventsResult {
  readonly unavailableCalendars: number
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
    range: Omit<ListCalendarEventsOptions, 'userId'>,
  ): Promise<ProviderConnectionEventsResult> => {
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
      unavailableCalendars: result.unavailableCalendars,
    }
  }

  return {
    beginConnection: async (beginOptions) => {
      const state = createOpaqueToken()
      const codeVerifier = createOpaqueToken()
      const codeChallenge = createCodeChallenge(codeVerifier)
      await options.repository.createOauthState({
        codeVerifier,
        expiresAt: new Date(now().getTime() + OAUTH_STATE_LIFETIME_MILLISECONDS),
        provider: beginOptions.provider,
        redirectUri: beginOptions.redirectUri,
        stateHash: hashOpaqueToken(state),
        userId: beginOptions.userId,
      })
      return options.providerFor(beginOptions.provider).createAuthorizationUrl({
        codeChallenge,
        redirectUri: beginOptions.redirectUri,
        state,
      })
    },
    completeConnection: async (completeOptions) => {
      const oauthState = await options.repository.consumeOauthState(
        completeOptions.provider,
        hashOpaqueToken(completeOptions.state),
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
        unavailableConnections: results.filter(
          (result) => result.status === 'rejected' || result.value.unavailableCalendars > 0,
        ).length,
      }
    },
  }
}
