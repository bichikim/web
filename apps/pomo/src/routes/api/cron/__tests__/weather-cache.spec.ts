import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const maintenanceMocks = vi.hoisted(() => ({runWeatherCacheMaintenance: vi.fn()}))

vi.mock('src/server/weather/cache-maintenance', () => maintenanceMocks)

import {GET} from '../weather-cache'
import {invokeApiRoute} from '../../__tests__/invoke'

const CRON_SECRET = 'cron-secret-1234'
const createRequest = (authorization?: string): Request =>
  new Request('https://www.pomofi.io/api/cron/weather-cache', {
    headers: authorization === undefined ? undefined : {authorization},
  })

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', CRON_SECRET)
  maintenanceMocks.runWeatherCacheMaintenance.mockReset().mockResolvedValue({
    complete: true,
    deleted: 2,
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
  expect(maintenanceMocks.runWeatherCacheMaintenance).not.toHaveBeenCalled()
})

it('should reject a request with a mismatched cron secret', async () => {
  const response = await invokeApiRoute(GET, createRequest('Bearer wrong-secret'))

  expect(response.status).toBe(401)
  expect(maintenanceMocks.runWeatherCacheMaintenance).not.toHaveBeenCalled()
})

it('should return non-sensitive deletion totals for an authorized request', async () => {
  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({complete: true, deleted: 2})
  expect(maintenanceMocks.runWeatherCacheMaintenance).toHaveBeenCalledOnce()
})

it('should expose a deletion failure as an internal server error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  maintenanceMocks.runWeatherCacheMaintenance.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(500)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.text()).resolves.toBe('Weather cache maintenance failed')
})
