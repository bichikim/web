import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const maintenanceMocks = vi.hoisted(() => ({runTrackDeletionMaintenance: vi.fn()}))

vi.mock('src/server/music/track-deletion-maintenance', () => maintenanceMocks)

import {GET} from '../music-track-deletions'
import {invokeApiRoute} from '../../__tests__/invoke'

const CRON_SECRET = 'cron-secret-1234'
const createRequest = (authorization?: string): Request =>
  new Request('https://www.pomofi.io/api/cron/music-track-deletions', {
    headers: authorization === undefined ? undefined : {authorization},
  })

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', CRON_SECRET)
  maintenanceMocks.runTrackDeletionMaintenance.mockReset().mockResolvedValue({
    complete: true,
    finalized: 2,
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
  expect(maintenanceMocks.runTrackDeletionMaintenance).not.toHaveBeenCalled()
})

it('should reject a request with a mismatched cron secret', async () => {
  const response = await invokeApiRoute(GET, createRequest('Bearer wrong-secret'))

  expect(response.status).toBe(401)
  expect(maintenanceMocks.runTrackDeletionMaintenance).not.toHaveBeenCalled()
})

it('should return non-sensitive finalization totals for an authorized request', async () => {
  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({complete: true, finalized: 2})
  expect(maintenanceMocks.runTrackDeletionMaintenance).toHaveBeenCalledOnce()
})

it('should expose a finalization failure as an internal server error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  maintenanceMocks.runTrackDeletionMaintenance.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(500)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.text()).resolves.toBe('Music track deletion maintenance failed')
})
