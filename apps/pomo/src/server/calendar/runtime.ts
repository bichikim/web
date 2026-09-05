import {env} from 'src/env'
import type {CalendarProviderId} from 'src/features/calendar'

import {createGoogleCalendarProvider} from './providers/google'
import {createMicrosoftCalendarProvider} from './providers/microsoft'
import type {CalendarProvider} from './providers/types'
import {calendarRepository} from './repository'
import {
  type CalendarConnectionSummary,
  type CalendarService,
  createCalendarService,
} from './service'
import {createTokenVault} from './token-vault'

const requireSetting = (name: string, value: string | undefined): string => {
  if (value === undefined) {
    throw new TypeError(`${name} is not set`)
  }

  return value
}

let calendarService: CalendarService | undefined
const providers: Partial<Record<CalendarProviderId, CalendarProvider>> = {}

const providerFor = (provider: CalendarProviderId): CalendarProvider => {
  const currentProvider = providers[provider]
  if (currentProvider !== undefined) {
    return currentProvider
  }

  const createdProvider =
    provider === 'google'
      ? createGoogleCalendarProvider({
          clientId: requireSetting('GOOGLE_CALENDAR_CLIENT_ID', env.GOOGLE_CALENDAR_CLIENT_ID),
          clientSecret: requireSetting(
            'GOOGLE_CALENDAR_CLIENT_SECRET',
            env.GOOGLE_CALENDAR_CLIENT_SECRET,
          ),
        })
      : createMicrosoftCalendarProvider({
          clientId: requireSetting(
            'MICROSOFT_CALENDAR_CLIENT_ID',
            env.MICROSOFT_CALENDAR_CLIENT_ID,
          ),
          clientSecret: requireSetting(
            'MICROSOFT_CALENDAR_CLIENT_SECRET',
            env.MICROSOFT_CALENDAR_CLIENT_SECRET,
          ),
        })
  providers[provider] = createdProvider
  return createdProvider
}

/** Lists connection metadata without requiring provider OAuth credentials. */
export const listCalendarConnections = async (
  userId: string,
): Promise<ReadonlyArray<CalendarConnectionSummary>> =>
  (await calendarRepository.listConnections(userId)).map((connection) => ({
    accountLabel: connection.accountLabel,
    id: connection.id,
    provider: connection.provider,
  }))

/** Deletes connection metadata owned by the authenticated user. */
export const deleteCalendarConnection = (userId: string, connectionId: string): Promise<boolean> =>
  calendarRepository.deleteConnection(userId, connectionId)

/** Returns the calendar service only after every server-side OAuth setting is configured. */
export const getCalendarService = (): CalendarService => {
  calendarService ??= createCalendarService({
    providerFor,
    repository: calendarRepository,
    vault: createTokenVault(
      requireSetting('POMO_CALENDAR_TOKEN_ENCRYPTION_KEY', env.POMO_CALENDAR_TOKEN_ENCRYPTION_KEY),
    ),
  })

  return calendarService
}
