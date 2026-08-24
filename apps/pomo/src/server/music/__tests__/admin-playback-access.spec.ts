import {beforeEach, describe, expect, it, vi} from 'vitest'

const gatewayMocks = vi.hoisted(() => ({createPlaybackAccess: vi.fn()}))
const storageMocks = vi.hoisted(() => ({createTrackPlayback: vi.fn()}))

vi.mock('../playback-access', () => gatewayMocks)
vi.mock('../track-upload', () => storageMocks)

import {createAdminPlaybackAccess} from '../admin-playback-access'

const ASSET = {
  assetId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  objectKey:
    'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3',
}

describe('createAdminPlaybackAccess', () => {
  beforeEach(() => {
    gatewayMocks.createPlaybackAccess.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-08-23T00:15:00.000Z'),
      url: 'https://audio.pomofi.io/tracks/asset/source.mp3?token=signed',
    })
    storageMocks.createTrackPlayback.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-08-23T00:15:00.000Z'),
      url: 'https://account-id.r2.cloudflarestorage.com/bucket/source.mp3?X-Amz-Signature=signed',
    })
  })

  it('should use the cached audio gateway when its shared signing configuration exists', async () => {
    const environment = {
      POMO_AUDIO_GATEWAY_ORIGIN: 'https://audio.pomofi.io',
      POMO_PLAYBACK_TOKEN_SECRET: 'shared-secret',
    }

    const result = await createAdminPlaybackAccess({asset: ASSET, environment})

    expect(gatewayMocks.createPlaybackAccess).toHaveBeenCalledWith({asset: ASSET, environment})
    expect(storageMocks.createTrackPlayback).not.toHaveBeenCalled()
    expect(result.url).toContain('audio.pomofi.io')
  })

  it('should create a signed R2 playback URL when the gateway is not configured', async () => {
    const environment = {CLOUDFLARE_R2_ACCOUNT_ID: 'account-id'}

    const result = await createAdminPlaybackAccess({asset: ASSET, environment})

    expect(gatewayMocks.createPlaybackAccess).not.toHaveBeenCalled()
    expect(storageMocks.createTrackPlayback).toHaveBeenCalledWith(ASSET.objectKey, {environment})
    expect(result.url).toContain('r2.cloudflarestorage.com')
  })
})
