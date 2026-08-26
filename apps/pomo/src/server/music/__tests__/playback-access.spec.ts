import {afterEach, describe, expect, it, vi} from 'vitest'

import {verifyPlaybackToken} from '@pomo/playback-token'

import {createPlaybackAccess} from '../playback-access'

const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const OBJECT_KEY = `tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/${ASSET_ID}/source.mp3`
const SECRET = 'playback-access-test-secret-is-at-least-32-bytes'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('createPlaybackAccess', () => {
  it('returns a short-lived gateway URL for the immutable asset', async () => {
    const now = new Date('2026-08-22T00:00:00.000Z')
    const access = await createPlaybackAccess({
      asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
      environment: {
        POMO_AUDIO_GATEWAY_ORIGIN: 'https://audio.pomofi.io',
        POMO_PLAYBACK_TOKEN_SECRET: SECRET,
      },
      now,
    })
    const url = new URL(access.url)
    const token = url.searchParams.get('token')

    expect(url.origin).toBe('https://audio.pomofi.io')
    expect(url.pathname).toBe(`/tracks/${ASSET_ID}/source.mp3`)
    expect(access.expiresAt).toEqual(new Date('2026-08-22T00:15:00.000Z'))
    expect(token).not.toBeNull()
    await expect(
      verifyPlaybackToken(token ?? '', {now, scope: 'full', secret: SECRET}),
    ).resolves.toMatchObject({assetId: ASSET_ID, objectKey: OBJECT_KEY, scope: 'full'})
  })

  it('rejects an origin containing a path', async () => {
    await expect(
      createPlaybackAccess({
        asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
        environment: {
          POMO_AUDIO_GATEWAY_ORIGIN: 'https://audio.pomofi.io/private',
          POMO_PLAYBACK_TOKEN_SECRET: SECRET,
        },
      }),
    ).rejects.toThrow('POMO_AUDIO_GATEWAY_ORIGIN')
  })

  it.each([undefined, '', '   '] as const)(
    'rejects the missing gateway origin %s',
    async (origin) => {
      await expect(
        createPlaybackAccess({
          asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
          environment: {
            POMO_AUDIO_GATEWAY_ORIGIN: origin,
            POMO_PLAYBACK_TOKEN_SECRET: SECRET,
          },
        }),
      ).rejects.toThrow('POMO_AUDIO_GATEWAY_ORIGIN is not set')
    },
  )

  it.each([undefined, '', '   '] as const)(
    'rejects the missing playback secret %s',
    async (secret) => {
      await expect(
        createPlaybackAccess({
          asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
          environment: {
            POMO_AUDIO_GATEWAY_ORIGIN: 'https://audio.pomofi.io',
            POMO_PLAYBACK_TOKEN_SECRET: secret,
          },
        }),
      ).rejects.toThrow('POMO_PLAYBACK_TOKEN_SECRET is not set')
    },
  )

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects the invalid token duration %s',
    async (tokenSeconds) => {
      await expect(
        createPlaybackAccess({
          asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
          environment: {
            POMO_AUDIO_GATEWAY_ORIGIN: 'https://audio.pomofi.io',
            POMO_PLAYBACK_TOKEN_SECRET: SECRET,
          },
          tokenSeconds,
        }),
      ).rejects.toThrow('Playback token duration must be a positive integer')
    },
  )

  it('uses process environment, current time, custom duration, and a trailing origin slash', async () => {
    const now = new Date('2026-08-26T00:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)
    vi.stubEnv('POMO_AUDIO_GATEWAY_ORIGIN', ' https://audio.pomofi.io/ ')
    vi.stubEnv('POMO_PLAYBACK_TOKEN_SECRET', ` ${SECRET} `)

    const access = await createPlaybackAccess({
      asset: {assetId: ASSET_ID, objectKey: OBJECT_KEY},
      tokenSeconds: 60,
    })

    expect(access.expiresAt).toEqual(new Date('2026-08-26T00:01:00.000Z'))
    expect(new URL(access.url).origin).toBe('https://audio.pomofi.io')
  })
})
