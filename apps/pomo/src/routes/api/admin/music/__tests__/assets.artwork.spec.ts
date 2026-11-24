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

import {BLUE_ASSET, RED_ASSET, artworkPath, createStorage, sourcePath} from './fixtures/artwork'
import {PUT} from '../assets'
import {invokeApiRoute} from '../../../__tests__/invoke'

const artworkUrl = (assetId: string) => `https://images.example/track-artwork/${assetId}/cover`
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
  it('should parse each MP3, upload its own image, and persist the matching URL', async () => {
    const {objects} = await createStorage()
    expect((await complete(RED_ASSET)).status).toBe(200)
    expect((await complete(BLUE_ASSET)).status).toBe(200)
    const red = objects.get(artworkPath(RED_ASSET))
    const blue = objects.get(artworkPath(BLUE_ASSET))
    expect(red?.contentType).toBe('image/png')
    expect(blue?.contentType).toBe('image/png')
    const redImage = await readFile(new URL('./fixtures/artwork/red.png', import.meta.url))
    const blueImage = await readFile(new URL('./fixtures/artwork/blue.png', import.meta.url))
    expect(red?.body).toEqual(new Uint8Array(redImage))
    expect(blue?.body).toEqual(new Uint8Array(blueImage))
    expect(repository.completeTrackRegistration).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({artworkUrl: artworkUrl(RED_ASSET), assetId: RED_ASSET}),
    )
    expect(repository.completeTrackRegistration).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({artworkUrl: artworkUrl(BLUE_ASSET), assetId: BLUE_ASSET}),
    )
  })

  it('should reject a truncated ID3 tag before generating a preview', async () => {
    const {fetcher} = await createStorage()
    const store = fetcher.getMockImplementation()!
    fetcher.mockImplementation(async (input, options) => {
      const response = await store(input, options)
      if (input instanceof Request && input.method === 'GET') {
        const bytes = new Uint8Array(await response.arrayBuffer())
        bytes.set([1, 64, 0, 0], 6)
        return new Response(bytes, {headers: response.headers})
      }
      return response
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await complete(RED_ASSET)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({error: 'invalid_mp3'})
    expect(repository.failTrackAsset).toHaveBeenCalledExactlyOnceWith(RED_ASSET, 'invalid_mp3_id3')
    expect(repository.completeTrackRegistration).not.toHaveBeenCalled()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('should keep the track pending when artwork storage fails and register the image on retry', async () => {
    const {fetcher, objects} = await createStorage()
    const store = fetcher.getMockImplementation()!
    let rejectArtwork = true
    fetcher.mockImplementation(async (input, options) => {
      if (
        input instanceof Request &&
        new URL(input.url).pathname === artworkPath(RED_ASSET) &&
        rejectArtwork
      ) {
        rejectArtwork = false
        return new Response(null, {status: 503})
      }
      return store(input, options)
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect((await complete(RED_ASSET)).status).toBe(503)
    expect(repository.completeTrackRegistration).not.toHaveBeenCalled()
    expect(repository.failTrackAsset).not.toHaveBeenCalled()
    expect((await complete(RED_ASSET)).status).toBe(200)
    expect(objects.get(artworkPath(RED_ASSET))?.contentType).toBe('image/png')
    expect(repository.completeTrackRegistration).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({artworkUrl: artworkUrl(RED_ASSET), assetId: RED_ASSET}),
    )
  })
})
