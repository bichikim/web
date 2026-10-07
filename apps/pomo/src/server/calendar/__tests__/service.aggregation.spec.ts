/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import type {CalendarRepository} from 'src/server/repositories/calendar'
import type {CalendarProvider, ProviderEvent, ProviderEventsResult} from '../providers/types'
import {createCalendarService} from '../service'
import type {TokenVault} from '../token-vault'

const provider: CalendarProvider = {
  createAuthorizationUrl: vi.fn(),
  exchangeCode: vi.fn(),
  listEvents: vi.fn(),
  provider: 'google',
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
const vault: TokenVault = {open: vi.fn(), seal: vi.fn()}
const service = createCalendarService({providerFor: () => provider, repository, vault})
const RANGE = {
  displayTimeZone: 'UTC',
  end: '2026-09-05T00:00:00.000Z',
  start: '2026-09-04T00:00:00.000Z',
  userId: 'user-1',
}

const connection = (id: string) => ({
  accountLabel: id,
  encryptedTokens: id,
  id,
  provider: 'google' as const,
})
const event = (id: string): ProviderEvent => ({
  allDay: false,
  calendarLabel: 'Calendar',
  end: '2026-09-04T11:00:00.000Z',
  id,
  start: '2026-09-04T10:00:00.000Z',
  title: id,
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(vault.open).mockImplementation((accessToken) => ({
    accessToken,
    expiresAt: null,
    refreshToken: null,
  }))
})

it('should return an empty available result when no connections exist', async () => {
  vi.mocked(repository.listConnections).mockResolvedValue([])

  await expect(service.listEvents(RANGE)).resolves.toEqual({
    connectedConnections: 0,
    events: [],
    truncated: false,
    unavailableConnections: 0,
  })
  expect(provider.listEvents).not.toHaveBeenCalled()
})

it('should count every failed connection including an aborted provider request', async () => {
  vi.mocked(repository.listConnections).mockResolvedValue([
    connection('failed'),
    connection('aborted'),
  ])
  vi.mocked(provider.listEvents)
    .mockRejectedValueOnce(new Error('Provider unavailable'))
    .mockRejectedValueOnce(new DOMException('Request aborted', 'AbortError'))

  await expect(service.listEvents(RANGE)).resolves.toEqual({
    connectedConnections: 2,
    events: [],
    truncated: false,
    unavailableConnections: 2,
  })
})

it('should retain sorted events and count each partially unavailable connection only once', async () => {
  const healthy = Object.freeze({
    events: Object.freeze([
      Object.freeze({...event('late'), start: '2026-09-04T10:30:00.000Z'}),
      Object.freeze(event('early')),
    ]),
    truncated: false,
    unavailableCalendars: 0,
  })
  const partialEvent = Object.freeze({
    ...event('partial'),
    exactInstantRange: Object.freeze({end: RANGE.end, start: RANGE.start}),
  })
  const partial = Object.freeze({
    events: Object.freeze([partialEvent]),
    truncated: true,
    unavailableCalendars: 3,
  })
  const connections = Object.freeze([
    Object.freeze(connection('healthy')),
    Object.freeze(connection('failed')),
    Object.freeze(connection('partial')),
    Object.freeze(connection('empty-partial')),
  ])
  vi.mocked(repository.listConnections).mockResolvedValue(connections)
  vi.mocked(provider.listEvents)
    .mockResolvedValueOnce(healthy)
    .mockRejectedValueOnce(new Error('Provider unavailable'))
    .mockResolvedValueOnce(partial)
    .mockResolvedValueOnce({events: [], truncated: false, unavailableCalendars: 2})

  const result = await service.listEvents(RANGE)

  expect(result).toEqual({
    connectedConnections: 4,
    events: [
      {...event('healthy:early'), accountLabel: 'healthy', provider: 'google', title: 'early'},
      {...event('partial:partial'), accountLabel: 'partial', provider: 'google', title: 'partial'},
      {
        ...event('healthy:late'),
        accountLabel: 'healthy',
        provider: 'google',
        start: '2026-09-04T10:30:00.000Z',
        title: 'late',
      },
    ],
    truncated: true,
    unavailableConnections: 3,
  })
  expect(healthy.events.map(({id}) => id)).toEqual(['late', 'early'])
  expect(partial.events[0]).toBe(partialEvent)
  expect(partialEvent.exactInstantRange).toEqual({end: RANGE.end, start: RANGE.start})
})

it('should preserve connection order for equal starts despite reverse completion order', async () => {
  const first = Promise.withResolvers<ProviderEventsResult>()
  const second = Promise.withResolvers<ProviderEventsResult>()
  const started = Promise.withResolvers<void>()
  vi.mocked(repository.listConnections).mockResolvedValue([
    connection('first'),
    connection('second'),
  ])
  vi.mocked(provider.listEvents)
    .mockReturnValueOnce(first.promise)
    .mockImplementationOnce(() => {
      started.resolve()
      return second.promise
    })
  let completed = false
  const pending = service.listEvents(RANGE).then((result) => {
    completed = true
    return result
  })
  await started.promise
  second.resolve({events: [event('second')], truncated: false, unavailableCalendars: 0})
  await second.promise
  expect(completed).toBe(false)
  first.resolve({events: [event('first')], truncated: false, unavailableCalendars: 0})

  const result = await pending

  expect(result.events.map(({id}) => id)).toEqual(['first:first', 'second:second'])
  expect(provider.listEvents).toHaveBeenCalledTimes(2)
})

it('should preserve truncation and partial availability when instant filtering removes all events', async () => {
  vi.mocked(repository.listConnections).mockResolvedValue([connection('partial')])
  vi.mocked(provider.listEvents).mockResolvedValue({
    events: [event('ended')],
    truncated: true,
    unavailableCalendars: 4,
  })

  await expect(
    service.listEvents({at: '2026-09-04T11:00:00.000Z', displayTimeZone: 'UTC', userId: 'user-1'}),
  ).resolves.toEqual({
    connectedConnections: 1,
    events: [],
    truncated: true,
    unavailableConnections: 1,
  })
})

it('should propagate repository failures before making any provider request', async () => {
  const error = new Error('Database unavailable')
  vi.mocked(repository.listConnections).mockRejectedValue(error)

  await expect(service.listEvents(RANGE)).rejects.toBe(error)
  expect(provider.listEvents).not.toHaveBeenCalled()
})
