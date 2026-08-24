import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const maintenanceMocks = vi.hoisted(() => ({runAuthMaintenance: vi.fn()}))

vi.mock('src/server/user-auth/maintenance', () => maintenanceMocks)

import {GET} from '../auth-maintenance'
import {invokeApiRoute} from '../../__tests__/invoke'

const CRON_SECRET = 'cron-secret-1234'
const createRequest = (authorization?: string): Request =>
  new Request('https://www.pomofi.io/api/cron/auth-maintenance', {
    headers: authorization === undefined ? undefined : {authorization},
  })

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', CRON_SECRET)
  maintenanceMocks.runAuthMaintenance.mockReset().mockResolvedValue({
    accountLinkChallenges: {complete: true, deleted: 2},
    appSessions: {complete: true, deleted: 3},
    complete: true,
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('should reject a request when CRON_SECRET is missing', async () => {
  vi.stubEnv('CRON_SECRET', '')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await invokeApiRoute(GET, createRequest())

  expect(response.status).toBe(401)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(maintenanceMocks.runAuthMaintenance).not.toHaveBeenCalled()
})

it('should reject a request with a mismatched cron secret', async () => {
  const response = await invokeApiRoute(GET, createRequest('Bearer wrong-secret'))

  expect(response.status).toBe(401)
  expect(maintenanceMocks.runAuthMaintenance).not.toHaveBeenCalled()
})

it('should return non-sensitive deletion totals for an authorized request', async () => {
  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({
    accountLinkChallenges: {complete: true, deleted: 2},
    appSessions: {complete: true, deleted: 3},
    complete: true,
  })
  expect(maintenanceMocks.runAuthMaintenance).toHaveBeenCalledOnce()
})

it('should expose a deletion failure as an internal server error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  maintenanceMocks.runAuthMaintenance.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(500)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.text()).resolves.toBe('Auth maintenance failed')
})
