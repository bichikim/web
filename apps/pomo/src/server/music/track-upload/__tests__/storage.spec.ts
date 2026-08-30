import {AwsClient} from 'aws4fetch'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createTrackObjectUrl, signTrackObjectRequest} from '../storage'

vi.mock('aws4fetch', () => ({AwsClient: vi.fn()}))

const OBJECT_KEY = 'tracks/track-id/source.mp3'
const sign = vi.fn(async (request: Request) => request)

beforeEach(() => {
  vi.mocked(AwsClient).mockImplementation(function createMockAwsClient() {
    return {sign} as never
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('createTrackObjectUrl', () => {
  it('should create a prefixed URL with trimmed environment values', () => {
    const result = createTrackObjectUrl(OBJECT_KEY, {
      CLOUDFLARE_R2_ACCOUNT_ID: ' account-id ',
      POMO_PAID_AUDIO_R2_BUCKET: ' custom-bucket ',
      POMO_PAID_AUDIO_R2_PREFIX: ' /previews/pr-123/ ',
    })

    expect(result.href).toBe(
      `https://account-id.r2.cloudflarestorage.com/custom-bucket/previews/pr-123/${OBJECT_KEY}`,
    )
  })

  it('should use the default bucket without an optional prefix', () => {
    const result = createTrackObjectUrl(OBJECT_KEY, {
      CLOUDFLARE_R2_ACCOUNT_ID: 'account-id',
    })

    expect(result.pathname).toBe(`/pomofi-paid-audio/${OBJECT_KEY}`)
  })

  it('should reject missing account IDs and invalid prefixes', () => {
    expect(() => createTrackObjectUrl(OBJECT_KEY, {})).toThrow(
      'CLOUDFLARE_R2_ACCOUNT_ID is not set',
    )
    expect(() =>
      createTrackObjectUrl(OBJECT_KEY, {
        CLOUDFLARE_R2_ACCOUNT_ID: 'account-id',
        POMO_PAID_AUDIO_R2_PREFIX: 'previews/../production',
      }),
    ).toThrow('POMO_PAID_AUDIO_R2_PREFIX is invalid')
  })
})

describe('signTrackObjectRequest', () => {
  it('should use an injected signer', async () => {
    const signer = vi.fn(async (request: Request) => request)
    const request = new Request('https://example.com/source.mp3')

    await expect(signTrackObjectRequest(request, {}, true, signer)).resolves.toBe(request)
    expect(signer).toHaveBeenCalledWith(request, true)
    expect(AwsClient).not.toHaveBeenCalled()
  })

  it('should create an R2 signer with paid-audio credentials', async () => {
    const request = new Request('https://example.com/source.mp3')

    await signTrackObjectRequest(
      request,
      {
        POMO_PAID_AUDIO_R2_ACCESS_KEY_ID: ' access-key ',
        POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY: ' secret-key ',
      },
      false,
    )

    expect(AwsClient).toHaveBeenCalledWith({
      accessKeyId: 'access-key',
      region: 'auto',
      secretAccessKey: 'secret-key',
      service: 's3',
    })
    expect(sign).toHaveBeenCalledWith(request, {aws: {signQuery: false}})
  })

  it('should fall back to public asset credentials', async () => {
    await signTrackObjectRequest(
      new Request('https://example.com/source.mp3'),
      {
        POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID: 'public-access-key',
        POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY: 'public-secret-key',
      },
      true,
    )

    expect(AwsClient).toHaveBeenCalledWith(
      expect.objectContaining({
        accessKeyId: 'public-access-key',
        secretAccessKey: 'public-secret-key',
      }),
    )
  })

  it('should reject missing credentials', () => {
    expect(() =>
      signTrackObjectRequest(new Request('https://example.com/source.mp3'), {}, true),
    ).toThrow('POMO_PAID_AUDIO_R2_ACCESS_KEY_ID is not set')
  })
})
