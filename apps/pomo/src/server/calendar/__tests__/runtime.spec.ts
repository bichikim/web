/** @vitest-environment node */
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
    MICROSOFT_CALENDAR_CLIENT_ID: 'microsoft-client-id',
    MICROSOFT_CALENDAR_CLIENT_SECRET: 'microsoft-client-secret',
    POMO_CALENDAR_TOKEN_ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  },
}))
vi.mock('../providers/google', () => ({
  createGoogleCalendarProvider: mocks.createGoogleCalendarProvider,
}))
vi.mock('../providers/microsoft', () => ({
  createMicrosoftCalendarProvider: mocks.createMicrosoftCalendarProvider,
}))
vi.mock('../../repositories/calendar', () => ({calendarRepository: {}}))
vi.mock('../service', () => ({createCalendarService: mocks.createCalendarService}))
vi.mock('../token-vault', () => ({createTokenVault: mocks.createTokenVault}))

const googleProvider = {provider: 'google'} as CalendarProvider
const microsoftProvider = {provider: 'microsoft'} as CalendarProvider
const calendarService = {beginConnection: vi.fn()}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.createGoogleCalendarProvider.mockReturnValue(googleProvider)
  mocks.createMicrosoftCalendarProvider.mockReturnValue(microsoftProvider)
  mocks.createTokenVault.mockReturnValue({})
})

const loadRuntime = async () => import('../runtime')

it('should initialize Google without requiring Microsoft OAuth settings', async () => {
  mocks.createCalendarService.mockImplementation(
    (options: {readonly providerFor: (provider: CalendarProviderId) => CalendarProvider}) => {
      options.providerFor('google')
      return calendarService
    },
  )
  const {getCalendarService} = await loadRuntime()

  expect(getCalendarService()).toBe(calendarService)
  expect(mocks.createGoogleCalendarProvider).toHaveBeenCalledWith({
    clientId: 'google-client-id',
    clientSecret: 'google-client-secret',
  })
  expect(mocks.createMicrosoftCalendarProvider).not.toHaveBeenCalled()
})

it('should select Microsoft with its OAuth settings when requested', async () => {
  mocks.createCalendarService.mockImplementation(
    (options: {readonly providerFor: (provider: CalendarProviderId) => CalendarProvider}) => {
      options.providerFor('microsoft')
      return calendarService
    },
  )
  const {getCalendarService} = await loadRuntime()

  expect(getCalendarService()).toBe(calendarService)
  expect(mocks.createMicrosoftCalendarProvider).toHaveBeenCalledWith({
    clientId: 'microsoft-client-id',
    clientSecret: 'microsoft-client-secret',
  })
  expect(mocks.createGoogleCalendarProvider).not.toHaveBeenCalled()
})
