export interface ProviderEvent {
  readonly allDay: boolean
  readonly calendarLabel: string
  readonly end: string
  readonly id: string
  readonly start: string
  readonly title: string
}

export interface ListProviderEventsOptions {
  readonly accessToken: string
  readonly end: string
  readonly start: string
}

export interface CalendarProvider {
  readonly createAuthorizationUrl: (options: CreateAuthorizationUrlOptions) => string
  readonly exchangeCode: (options: ExchangeCalendarCodeOptions) => Promise<CalendarProviderTokens>
  readonly listEvents: (options: ListProviderEventsOptions) => Promise<ReadonlyArray<ProviderEvent>>
  readonly provider: CalendarProviderId
  readonly readAccount: (accessToken: string) => Promise<CalendarProviderAccount>
  readonly refreshTokens: (refreshToken: string) => Promise<CalendarProviderTokens>
}

export interface CreateCalendarProviderOptions {
  readonly clientId: string
  readonly clientSecret: string
  readonly fetch?: typeof globalThis.fetch
  readonly now?: () => Date
}
import type {CalendarProviderId} from 'src/features/calendar'

export interface CalendarProviderAccount {
  readonly label: string
  readonly subject: string
}

export interface CalendarProviderTokens {
  readonly accessToken: string
  readonly expiresAt: string | null
  readonly refreshToken: string | null
}

export interface CreateAuthorizationUrlOptions {
  readonly codeChallenge: string
  readonly redirectUri: string
  readonly state: string
}

export interface ExchangeCalendarCodeOptions {
  readonly code: string
  readonly codeVerifier: string
  readonly redirectUri: string
}
