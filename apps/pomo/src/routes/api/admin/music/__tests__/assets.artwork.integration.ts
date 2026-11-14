/** @vitest-environment node */
import {readFile} from 'node:fs/promises'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const repository = vi.hoisted(() => ({
  completeTrackRegistration: vi.fn(),
  failTrackAsset: vi.fn(),
  findTrackAsset: vi.fn(),
}))
vi.mock('src/server/auth/authorize-admin-request', () => ({
  authorizeAdminRequest: async () => ({authorized: true, cookies: []}),
}))
vi.mock('src/server/repositories/music-track-registration', () => repository)

import {RED_ASSET, artworkPath, createStorage, sourcePath} from './fixtures/artwork'
import {PUT} from '../assets'
import {invokeApiRoute} from '../../../__tests__/invoke'

const complete = (assetId: string) =>
  invokeApiRoute(
    PUT,
    new Request('https://example.com/api/admin/music/assets', {
      body: JSON.stringify({assetId}),
      headers: {'Content-Type': 'application/json'},
      method: 'PUT',
    }),
  )

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('CLOUDFLARE_R2_ACCOUNT_ID', 'test-account')
  vi.stubEnv('POMO_PAID_AUDIO_R2_ACCESS_KEY_ID', 'test-key')
  vi.stubEnv('POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY', 'test-secret')
  vi.stubEnv('POMO_PAID_AUDIO_R2_BUCKET', 'private')
  vi.stubEnv('POMO_PAID_AUDIO_R2_PREFIX', '')
  vi.stubEnv('POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID', 'test-key')
  vi.stubEnv('POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY', 'test-secret')
  vi.stubEnv('POMO_PUBLIC_ASSETS_R2_BUCKET', 'public')
  vi.stubEnv('POMO_PUBLIC_ASSETS_ORIGIN', 'https://images.example')
  repository.findTrackAsset.mockImplementation(async (id: string) => ({
    id,
    objectKey: sourcePath(id),
    status: 'pending',
  }))
  repository.completeTrackRegistration.mockResolvedValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('embedded artwork registration with real MP3 files', () => {
  it.each([614_400, 3_145_728])(
    'should register supported embedded artwork with %i bytes of ID3 padding',
    async (paddingBytes) => {
      const {fetcher, objects} = await createStorage(paddingBytes)
      const response = await complete(RED_ASSET)
      expect(await response.json()).toEqual({assetId: RED_ASSET, status: 'active'})
      expect(response.status).toBe(200)
      const ranges = fetcher.mock.calls
        .map(([request]) => (request instanceof Request ? request.headers.get('Range') : null))
        .filter((range) => range !== null)
      expect(ranges).toHaveLength(2)
      expect(ranges[0]).toBe('bytes=0-2097151')
      const [, start, end] = /^bytes=(\d+)-(\d+)$/u.exec(ranges[1]!)!
      expect(Number(start)).toBeGreaterThan(paddingBytes)
      expect(Number(end) - Number(start) + 1).toBe(2_097_152)
      expect(objects.get(artworkPath(RED_ASSET))?.body).toEqual(
        new Uint8Array(await readFile(new URL('./fixtures/artwork/red.png', import.meta.url))),
      )
    },
  )
})
