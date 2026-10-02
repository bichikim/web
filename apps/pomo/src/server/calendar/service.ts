import {
  type CalendarEvent,
  type CalendarEventLookup,
  type CalendarEventRange,
  type CalendarProviderId,
  parseAllDayDateKey,
} from 'src/features/calendar'
import {dayjs} from 'src/utils/zoned-dayjs'
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
// Google bounds are exclusive and ignore milliseconds; pad by one second, then filter at the exact point.
const CALENDAR_INSTANT_LOOKUP_PADDING_MILLISECONDS = 1000

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

type ListCalendarEventsOptions = CalendarEventLookup & {
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

interface CalendarEventSearch {
  readonly instant: Date | null
  readonly lookupInstant: string | null
  readonly range: CalendarEventRange
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

const createInstantLookupRange = (instant: Date): CalendarEventRange => ({
  end: new Date(instant.getTime() + CALENDAR_INSTANT_LOOKUP_PADDING_MILLISECONDS).toISOString(),
  start: new Date(instant.getTime() - CALENDAR_INSTANT_LOOKUP_PADDING_MILLISECONDS).toISOString(),
})

const createCalendarEventSearch = (lookup: CalendarEventLookup): CalendarEventSearch => {
  if (!('at' in lookup)) {
    return {instant: null, lookupInstant: null, range: lookup}
  }

  const instant = new Date(lookup.at)
  return {instant, lookupInstant: lookup.at, range: createInstantLookupRange(instant)}
}

const eventMatchesInstant = (event: CalendarEvent, instant: Date, timeZone: string) => {
  if (event.allDay) {
    const startDate = parseAllDayDateKey(event.start)
    const endDate = parseAllDayDateKey(event.end)
    if (startDate === null || endDate === null) {
      return false
    }

    const calendarTimeZone = event.calendarTimeZone ?? timeZone
    const start = dayjs.tz(`${startDate}T00:00:00`, calendarTimeZone).valueOf()
    const end = dayjs.tz(`${endDate}T00:00:00`, calendarTimeZone).valueOf()
    return start <= instant.getTime() && instant.getTime() < end
  }

  const start = new Date(event.start).getTime()
  const end = new Date(event.end).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return false
  }

  return start === instant.getTime()
    ? end >= instant.getTime()
    : start < instant.getTime() && end > instant.getTime()
}

const shouldRefresh = (tokens: CalendarProviderTokens, now: Date) =>
  tokens.expiresAt !== null &&
  new Date(tokens.expiresAt).getTime() <= now.getTime() + TOKEN_REFRESH_LEEWAY_MILLISECONDS

export const createCalendarService = (options: CreateCalendarServiceOptions): CalendarService => {
  const now = options.now ?? (() => new Date())

  const readConnectionEvents = async (
    connection: CalendarConnectionRecord,
    range: CalendarEventRange & {readonly displayTimeZone: string; readonly lookupInstant?: string},
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
      const {displayTimeZone, userId, ...lookup} = listOptions
      const {instant, lookupInstant, range} = createCalendarEventSearch(lookup)
      const providerRange = {
        ...range,
        displayTimeZone,
        ...(lookupInstant === null ? {} : {lookupInstant}),
      }
      const connections = await options.repository.listConnections(userId)
      const results = await Promise.allSettled(
        connections.map((connection) => readConnectionEvents(connection, providerRange)),
      )
      const events = results
        .flatMap((result) => (result.status === 'fulfilled' ? result.value.events : []))
        .filter((event) => instant === null || eventMatchesInstant(event, instant, displayTimeZone))
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
