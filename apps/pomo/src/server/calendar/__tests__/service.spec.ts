import {beforeEach, expect, it, vi} from 'vitest'

import type {CalendarProvider} from '../providers/types'
import {type CalendarRepository, createCalendarService} from '../service'
import type {TokenVault} from '../token-vault'

const googleProvider: CalendarProvider = {
  createAuthorizationUrl: vi.fn(() => 'https://accounts.google.com/authorize'),
  exchangeCode: vi.fn(),
  listEvents: vi.fn(),
  provider: 'google',
  readAccount: vi.fn(),
  refreshTokens: vi.fn(),
}
const microsoftProvider: CalendarProvider = {
  createAuthorizationUrl: vi.fn(() => 'https://login.microsoftonline.com/authorize'),
  exchangeCode: vi.fn(),
  listEvents: vi.fn(),
  provider: 'microsoft',
  readAccount: vi.fn(),
  refreshTokens: vi.fn(),
}
const repository: CalendarRepository = {
  consumeOauthState: vi.fn(),
  createOauthState: vi.fn(),
  deleteConnection: vi.fn(),
  listConnections: vi.fn(),
  saveConnection: vi.fn(),
  withLockedTokens: vi.fn(),
}
const vault: TokenVault = {
  open: vi.fn(),
  seal: vi.fn(() => 'sealed-tokens'),
}
const providerFor = (provider: 'google' | 'microsoft') =>
  provider === 'google' ? googleProvider : microsoftProvider

beforeEach(() => {
  vi.clearAllMocks()
})

it('should persist an OAuth challenge before returning the provider authorization URL', async () => {
  vi.mocked(repository.createOauthState).mockResolvedValue({
    codeChallenge: 'challenge',
    state: 'state-token',
  })
  const service = createCalendarService({
    now: () => new Date('2026-09-04T10:00:00.000Z'),
    providerFor,
    repository,
    vault,
  })

  await expect(
    service.beginConnection({
      provider: 'google',
      redirectUri: 'https://pomofi.io/api/calendar/callback/google',
      userId: 'user-1',
    }),
  ).resolves.toBe('https://accounts.google.com/authorize')
  expect(googleProvider.createAuthorizationUrl).toHaveBeenCalledWith({
    codeChallenge: 'challenge',
    redirectUri: 'https://pomofi.io/api/calendar/callback/google',
    state: 'state-token',
  })
})

it('should exchange one consumed OAuth state and store encrypted account tokens', async () => {
  vi.mocked(repository.consumeOauthState).mockResolvedValue({
    codeVerifier: 'verifier',
    redirectUri: 'https://pomofi.io/api/calendar/callback/google',
    userId: 'user-1',
  })
  vi.mocked(googleProvider.exchangeCode).mockResolvedValue({
    accessToken: 'access',
    expiresAt: '2026-09-04T11:00:00.000Z',
    refreshToken: 'refresh',
  })
  vi.mocked(googleProvider.readAccount).mockResolvedValue({
    label: 'person@example.com',
    subject: 'google-subject',
  })
  const service = createCalendarService({
    now: () => new Date('2026-09-04T10:00:00.000Z'),
    providerFor,
    repository,
    vault,
  })

  await expect(
    service.completeConnection({code: 'code', provider: 'google', state: 'state-token'}),
  ).resolves.toBe(true)
  expect(repository.saveConnection).toHaveBeenCalledWith({
    accountLabel: 'person@example.com',
    encryptedTokens: 'sealed-tokens',
    provider: 'google',
    providerSubject: 'google-subject',
    userId: 'user-1',
  })
})

it('should refresh expired tokens and preserve events from another provider failure', async () => {
  vi.mocked(repository.listConnections).mockResolvedValue([
    {
      accountLabel: 'work@example.com',
      encryptedTokens: 'google-sealed',
      id: 'google-connection',
      provider: 'google',
    },
    {
      accountLabel: 'Personal',
      encryptedTokens: 'microsoft-sealed',
      id: 'microsoft-connection',
      provider: 'microsoft',
    },
  ])
  vi.mocked(vault.open).mockImplementation((encryptedTokens) =>
    encryptedTokens === 'google-sealed'
      ? {
          accessToken: 'expired',
          expiresAt: '2026-09-04T09:00:00.000Z',
          refreshToken: 'google-refresh',
        }
      : encryptedTokens === 'sealed-tokens'
        ? {
            accessToken: 'fresh',
            expiresAt: '2026-09-04T11:00:00.000Z',
            refreshToken: 'new-refresh',
          }
        : {
            accessToken: 'microsoft-access',
            expiresAt: '2026-09-04T11:00:00.000Z',
            refreshToken: 'microsoft-refresh',
          },
  )
  vi.mocked(repository.withLockedTokens).mockImplementation(async (_connectionId, operation) =>
    operation('google-sealed'),
  )
  vi.mocked(googleProvider.refreshTokens).mockResolvedValue({
    accessToken: 'fresh',
    expiresAt: '2026-09-04T11:00:00.000Z',
    refreshToken: 'new-refresh',
  })
  vi.mocked(googleProvider.listEvents).mockResolvedValue([
    {
      allDay: false,
      calendarLabel: '업무',
      end: '2026-09-04T11:00:00.000Z',
      id: 'event-1',
      start: '2026-09-04T10:30:00.000Z',
      title: '회의',
    },
  ])
  vi.mocked(microsoftProvider.listEvents).mockRejectedValue(new Error('Graph unavailable'))
  const service = createCalendarService({
    now: () => new Date('2026-09-04T10:00:00.000Z'),
    providerFor,
    repository,
    vault,
  })

  await expect(
    service.listEvents({
      end: '2026-09-05T00:00:00.000Z',
      start: '2026-09-04T10:00:00.000Z',
      userId: 'user-1',
    }),
  ).resolves.toEqual({
    connectedConnections: 2,
    events: [
      {
        accountLabel: 'work@example.com',
        allDay: false,
        calendarLabel: '업무',
        end: '2026-09-04T11:00:00.000Z',
        id: 'google-connection:event-1',
        provider: 'google',
        start: '2026-09-04T10:30:00.000Z',
        title: '회의',
      },
    ],
    unavailableConnections: 1,
  })
  expect(googleProvider.listEvents).toHaveBeenCalledWith({
    accessToken: 'fresh',
    end: '2026-09-05T00:00:00.000Z',
    start: '2026-09-04T10:00:00.000Z',
  })
  expect(repository.withLockedTokens).toHaveBeenCalledWith(
    'google-connection',
    expect.any(Function),
  )
})

it('should preserve more than forty events for the calendar view', async () => {
  vi.mocked(repository.listConnections).mockResolvedValue([
    {
      accountLabel: 'work@example.com',
      encryptedTokens: 'google-sealed',
      id: 'google-connection',
      provider: 'google',
    },
  ])
  vi.mocked(vault.open).mockReturnValue({
    accessToken: 'access',
    expiresAt: '2026-09-04T11:00:00.000Z',
    refreshToken: 'refresh',
  })
  vi.mocked(googleProvider.listEvents).mockResolvedValue(
    Array.from({length: 41}, (_, index) => ({
      allDay: true,
      calendarLabel: '업무',
      end: `2026-09-${String(index + 2).padStart(2, '0')}`,
      id: `event-${index}`,
      start: `2026-09-${String(index + 1).padStart(2, '0')}`,
      title: `일정 ${index}`,
    })),
  )
  const service = createCalendarService({providerFor, repository, vault})

  const result = await service.listEvents({
    end: '2026-10-01T00:00:00.000Z',
    start: '2026-09-01T00:00:00.000Z',
    userId: 'user-1',
  })

  expect(result.events).toHaveLength(41)
})
