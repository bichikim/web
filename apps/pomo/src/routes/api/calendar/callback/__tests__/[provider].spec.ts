import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  completeConnection: vi.fn(),
  getCalendarService: vi.fn(),
}))

vi.mock('src/server/calendar/runtime', () => ({
  getCalendarService: dependencyMocks.getCalendarService,
}))

import {GET} from '../[provider]'

const createEvent = (provider: string, query: string): APIEvent =>
  ({
    params: {provider},
    request: new Request(`https://www.pomofi.io/api/calendar/callback/${provider}?${query}`),
  }) as unknown as APIEvent

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.getCalendarService.mockReturnValue({
    completeConnection: dependencyMocks.completeConnection,
  })
  dependencyMocks.completeConnection.mockResolvedValue(true)
})

it('should complete a valid provider callback and redirect to account settings', async () => {
  const response = await GET(createEvent('microsoft', 'code=code&state=state'))

  expect(response.status).toBe(302)
  expect(response.headers.get('Location')).toBe(
    'https://www.pomofi.io/account?calendar=connected&provider=microsoft',
  )
  expect(dependencyMocks.completeConnection).toHaveBeenCalledWith({
    code: 'code',
    provider: 'microsoft',
    state: 'state',
  })
})

it('should distinguish a rejected consent and an invalid state', async () => {
  const cancelled = await GET(createEvent('google', 'error=access_denied&state=state'))
  dependencyMocks.completeConnection.mockResolvedValueOnce(false)
  const invalid = await GET(createEvent('google', 'code=code&state=state'))

  expect(cancelled.headers.get('Location')).toContain('calendar=cancelled')
  expect(invalid.headers.get('Location')).toContain('calendar=invalid')
})
