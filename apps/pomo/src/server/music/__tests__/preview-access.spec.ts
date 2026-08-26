import {describe, expect, it} from 'vitest'

import {createPreviewAccess, verifyPreviewAccess} from '../preview-access'

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET = {
  assetId: '019d1990-1dc9-7255-a7b5-f9459dfaf782',
  objectKey:
    'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3',
}
const ENVIRONMENT = {
  POMO_PLAYBACK_TOKEN_SECRET: 'preview-access-test-secret-is-at-least-32-bytes',
}

describe('preview access', () => {
  it('should issue a five-minute asset-bound preview URL', async () => {
    const now = new Date('2026-08-24T01:00:00.000Z')
    const access = await createPreviewAccess({
      asset: ASSET,
      environment: ENVIRONMENT,
      now,
      trackId: TRACK_ID,
    })
    const url = new URL(access.url, 'https://www.pomofi.io')
    const token = url.searchParams.get('token')

    expect(access.expiresAt).toEqual(new Date('2026-08-24T01:05:00.000Z'))
    expect(url.pathname).toBe(`/api/music/tracks/${TRACK_ID}/preview`)
    expect(url.searchParams.get('asset')).toBe(ASSET.assetId)
    expect(token).not.toBeNull()
    await expect(
      verifyPreviewAccess({environment: ENVIRONMENT, now, token: token ?? ''}),
    ).resolves.toEqual(ASSET)
  })

  it('should reject an expired preview URL', async () => {
    const access = await createPreviewAccess({
      asset: ASSET,
      environment: ENVIRONMENT,
      now: new Date('2026-08-24T01:00:00.000Z'),
      tokenSeconds: 1,
      trackId: TRACK_ID,
    })
    const token = new URL(access.url, 'https://www.pomofi.io').searchParams.get('token') ?? ''

    await expect(
      verifyPreviewAccess({
        environment: ENVIRONMENT,
        now: new Date('2026-08-24T01:00:01.000Z'),
        token,
      }),
    ).resolves.toBeNull()
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'should reject invalid preview token duration %s',
    async (tokenSeconds) => {
      await expect(
        createPreviewAccess({
          asset: ASSET,
          environment: ENVIRONMENT,
          tokenSeconds,
          trackId: TRACK_ID,
        }),
      ).rejects.toThrow('Preview token duration must be a positive integer')
    },
  )

  it.each([{}, {POMO_PLAYBACK_TOKEN_SECRET: '   '}])(
    'should require a non-empty playback token secret',
    async (environment) => {
      await expect(
        createPreviewAccess({asset: ASSET, environment, trackId: TRACK_ID}),
      ).rejects.toThrow('POMO_PLAYBACK_TOKEN_SECRET is not set')
    },
  )
})
