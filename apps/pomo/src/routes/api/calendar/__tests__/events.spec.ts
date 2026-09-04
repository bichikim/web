import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  authenticateUserRequest: vi.fn(),
  getCalendarService: vi.fn(),
  listEvents: vi.fn(),
}))

vi.mock('src/server/user-auth/request', () => ({
  authenticateUserRequest: dependencyMocks.authenticateUserRequest,
}))
vi.mock('src/server/calendar/runtime', () => ({
  getCalendarService: dependencyMocks.getCalendarService,
}))

import {GET} from '../events'

const createEvent = (query: string): APIEvent =>
  ({request: new Request(`https://www.pomofi.io/api/calendar/events?${query}`)}) as APIEvent

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.authenticateUserRequest.mockResolvedValue({cookies: [], userId: 'user-1'})
  dependencyMocks.getCalendarService.mockReturnValue({listEvents: dependencyMocks.listEvents})
  dependencyMocks.listEvents.mockResolvedValue({
    connectedConnections: 0,
    events: [],
    unavailableConnections: 0,
  })
})

it('should require a user session', async () => {
  dependencyMocks.authenticateUserRequest.mockResolvedValue({
    cookies: ['session=refreshed'],
    userId: null,
  })

  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-05T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(response.status).toBe(401)
  expect(response.headers.getSetCookie()).toEqual(['session=refreshed'])
})

it('should reject reversed or unbounded query ranges', async () => {
  const reversed = await GET(
    createEvent(
      'start=2026-09-05T00%3A00%3A00.000Z&end=2026-09-04T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )
  const unbounded = await GET(
    createEvent(
      'start=2026-09-01T00%3A00%3A00.000Z&end=2026-11-01T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(reversed.status).toBe(400)
  expect(unbounded.status).toBe(400)
  expect(dependencyMocks.listEvents).not.toHaveBeenCalled()
})

it('should allow a 31-day calendar month across a daylight-saving transition', async () => {
  const response = await GET(
    createEvent(
      'start=2026-10-01T04%3A00%3A00.000Z&end=2026-11-01T05%3A00%3A00.000Z&timeZone=America%2FNew_York',
    ),
  )

  expect(response.status).toBe(200)
  expect(dependencyMocks.listEvents).toHaveBeenCalledTimes(1)
})

it('should return normalized events for the authenticated user', async () => {
  dependencyMocks.listEvents.mockResolvedValue({
    connectedConnections: 2,
    events: [{id: 'event-1'}],
    unavailableConnections: 1,
  })
  const response = await GET(
    createEvent(
      'start=2026-09-04T00%3A00%3A00.000Z&end=2026-09-05T00%3A00%3A00.000Z&timeZone=Asia%2FSeoul',
    ),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({
    connectedConnections: 2,
    events: [{id: 'event-1'}],
    timeZone: 'Asia/Seoul',
    unavailableConnections: 1,
  })
  expect(dependencyMocks.listEvents).toHaveBeenCalledWith({
    end: '2026-09-05T00:00:00.000Z',
    start: '2026-09-04T00:00:00.000Z',
    userId: 'user-1',
  })
})
