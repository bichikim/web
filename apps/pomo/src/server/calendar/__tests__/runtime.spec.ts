import {beforeEach, expect, it, vi} from 'vitest'

import type {CalendarProviderId} from 'src/features/calendar'
import type {CalendarProvider} from '../providers/types'

const mocks = vi.hoisted(() => ({
  createCalendarService: vi.fn(),
  createGoogleCalendarProvider: vi.fn(),
  createMicrosoftCalendarProvider: vi.fn(),
  createTokenVault: vi.fn(),
}))

vi.mock('src/env', () => ({
  env: {
    GOOGLE_CALENDAR_CLIENT_ID: 'google-client-id',
    GOOGLE_CALENDAR_CLIENT_SECRET: 'google-client-secret',
    POMO_CALENDAR_TOKEN_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  },
}))
vi.mock('../providers/google', () => ({
  createGoogleCalendarProvider: mocks.createGoogleCalendarProvider,
}))
vi.mock('../providers/microsoft', () => ({
  createMicrosoftCalendarProvider: mocks.createMicrosoftCalendarProvider,
}))
vi.mock('../repository', () => ({calendarRepository: {}}))
vi.mock('../service', () => ({createCalendarService: mocks.createCalendarService}))
vi.mock('../token-vault', () => ({createTokenVault: mocks.createTokenVault}))

import {getCalendarService} from '../runtime'

const googleProvider = {provider: 'google'} as CalendarProvider
const calendarService = {beginConnection: vi.fn()}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createGoogleCalendarProvider.mockReturnValue(googleProvider)
  mocks.createTokenVault.mockReturnValue({})
  mocks.createCalendarService.mockImplementation(
    (options: {readonly providerFor: (provider: CalendarProviderId) => CalendarProvider}) => {
      options.providerFor('google')
      return calendarService
    },
  )
})

it('should initialize Google without requiring Microsoft OAuth settings', () => {
  expect(getCalendarService()).toBe(calendarService)
  expect(mocks.createGoogleCalendarProvider).toHaveBeenCalledWith({
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
  })
  expect(mocks.createMicrosoftCalendarProvider).not.toHaveBeenCalled()
})
