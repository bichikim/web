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

import {PUT} from '../assets'
import {invokeApiRoute} from '../../../__tests__/invoke'

const TRACK_ID = '11111111-1111-4111-8111-111111111111'
const RED_ASSET = '22222222-2222-4222-8222-222222222222'
const BLUE_ASSET = '33333333-3333-4333-8333-333333333333'
const sourcePath = (assetId: string) => `tracks/${TRACK_ID}/${assetId}/source.mp3`
const artworkPath = (assetId: string) => `/public/track-artwork/${assetId}/cover`
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

interface StoredObject {
  readonly body: Uint8Array
  readonly contentType: string | null
}

// ID3v2 permits zero padding between its frames and the MPEG audio.
const padMetadata = (source: Buffer, paddingBytes: number): Buffer => {
  const headerBytes = 10
  const integerBase = 128
  const size = [...source.subarray(6, headerBytes)].reduce(
    (value, byte) => value * integerBase + byte,
    0,
  )
  const header = Buffer.from(source.subarray(0, headerBytes))
  let paddedSize = size + paddingBytes
  for (let index = headerBytes - 1; index >= 6; index -= 1) {
    header[index] = paddedSize % integerBase
    paddedSize = Math.floor(paddedSize / integerBase)
  }
  return Buffer.concat([
    header,
    source.subarray(headerBytes, headerBytes + size),
    Buffer.alloc(paddingBytes),
    source.subarray(headerBytes + size),
  ])
}

const createStorage = async (paddingBytes = 0) => {
  const red = await readFile(new URL('./fixtures/artwork/red.mp3', import.meta.url))
  const blue = await readFile(new URL('./fixtures/artwork/blue.mp3', import.meta.url))
  const sources = new Map([
    [`/private/${sourcePath(RED_ASSET)}`, padMetadata(red, paddingBytes)],
    [`/private/${sourcePath(BLUE_ASSET)}`, blue],
  ])
  const objects = new Map<string, StoredObject>()
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    if (!(input instanceof Request)) {
      throw new Error('Expected a signed storage request')
    }
    const path = new URL(input.url).pathname
    if (input.method === 'GET') {
      const source = sources.get(path)
      if (source === undefined) {
        throw new Error(`Unexpected storage read: ${path}`)
      }
      const range = /^bytes=(\d+)-(\d+)$/u.exec(input.headers.get('Range') ?? '')
      const body = range === null ? source : source.subarray(Number(range[1]), Number(range[2]) + 1)
      return new Response(new Uint8Array(body), {
        headers: {'Content-Length': String(body.byteLength), ETag: path},
      })
    }
    if (input.method === 'PUT') {
      objects.set(path, {
        body: new Uint8Array(await input.arrayBuffer()),
        contentType: input.headers.get('Content-Type'),
      })
      return new Response(null, {status: 200})
    }
    throw new Error(`Unexpected storage operation: ${input.method}`)
  })
  vi.stubGlobal('fetch', fetcher)
  return {fetcher, objects}
}

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
