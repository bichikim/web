import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const maintenanceMocks = vi.hoisted(() => ({runAlbumCoverMaintenance: vi.fn()}))

vi.mock('src/server/music/album-cover-maintenance', () => maintenanceMocks)

import {GET} from '../music-album-covers'
import {invokeApiRoute} from '../../__tests__/invoke'

const CRON_SECRET = 'cron-secret-1234'
const createRequest = (authorization?: string): Request =>
  new Request('https://www.pomofi.io/api/cron/music-album-covers', {
    headers: authorization === undefined ? undefined : {authorization},
  })

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', CRON_SECRET)
  maintenanceMocks.runAlbumCoverMaintenance.mockReset().mockResolvedValue({
    complete: true,
    finalized: 2,
  })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

it('should reject a request when cron authorization is unavailable', async () => {
  vi.stubEnv('CRON_SECRET', '')
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const response = await invokeApiRoute(GET, createRequest())

  expect(response.status).toBe(401)
  expect(maintenanceMocks.runAlbumCoverMaintenance).not.toHaveBeenCalled()
})

it('should reject a request with a mismatched cron secret', async () => {
  const response = await invokeApiRoute(GET, createRequest('Bearer wrong-secret'))

  expect(response.status).toBe(401)
  expect(maintenanceMocks.runAlbumCoverMaintenance).not.toHaveBeenCalled()
})

it('should return cleanup totals for an authorized request', async () => {
  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({complete: true, finalized: 2})
  expect(maintenanceMocks.runAlbumCoverMaintenance).toHaveBeenCalledOnce()
})

it('should expose a maintenance failure as an internal server error', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  maintenanceMocks.runAlbumCoverMaintenance.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(GET, createRequest(`Bearer ${CRON_SECRET}`))

  expect(response.status).toBe(500)
  await expect(response.text()).resolves.toBe('Album cover maintenance failed')
})
