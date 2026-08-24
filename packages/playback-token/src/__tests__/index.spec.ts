import {describe, expect, it} from 'vitest'

import {createPlaybackToken, verifyPlaybackToken} from '../index'

const SECRET = 'a-long-playback-token-secret-for-tests'
const TRACK_ID = '11111111-1111-4111-8111-111111111111'
const ASSET_ID = '22222222-2222-4222-8222-222222222222'
const OBJECT_KEY = `tracks/${TRACK_ID}/${ASSET_ID}/source.mp3`

const readTokenPayload = (token: string): unknown => {
  const encodedPayload = token.split('.')[0] ?? ''
  const base64 = encodedPayload.replaceAll('-', '+').replaceAll('_', '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  return JSON.parse(atob(`${base64}${padding}`)) as unknown
}

describe('playback token', () => {
  it('should round-trip an immutable paid audio asset', async () => {
    const expiresAt = new Date('2026-08-22T01:15:00.000Z')
    const token = await createPlaybackToken({
      assetId: ASSET_ID,
      expiresAt,
      objectKey: OBJECT_KEY,
      scope: 'full',
      secret: SECRET,
    })

    expect(readTokenPayload(token)).toMatchObject({version: 1})
    expect(readTokenPayload(token)).not.toHaveProperty('scope')

    await expect(
      verifyPlaybackToken(token, {
        now: new Date('2026-08-22T01:00:00.000Z'),
        scope: 'full',
        secret: SECRET,
      }),
    ).resolves.toEqual({assetId: ASSET_ID, expiresAt, objectKey: OBJECT_KEY, scope: 'full'})
  })

  it('should reject expired and modified bearer tokens', async () => {
    const token = await createPlaybackToken({
      assetId: ASSET_ID,
      expiresAt: new Date('2026-08-22T01:15:00.000Z'),
      objectKey: OBJECT_KEY,
      scope: 'preview',
      secret: SECRET,
    })

    expect(readTokenPayload(token)).toMatchObject({scope: 'preview', version: 2})

    await expect(
      verifyPlaybackToken(token, {
        now: new Date('2026-08-22T01:15:00.000Z'),
        scope: 'preview',
        secret: SECRET,
      }),
    ).resolves.toBeNull()
    await expect(
      verifyPlaybackToken(`${token.slice(0, -1)}x`, {
        now: new Date('2026-08-22T01:00:00.000Z'),
        scope: 'preview',
        secret: SECRET,
      }),
    ).resolves.toBeNull()
  })

  it('should reject an asset ID that does not own the object key', async () => {
    await expect(
      createPlaybackToken({
        assetId: '33333333-3333-4333-8333-333333333333',
        expiresAt: new Date('2026-08-22T01:15:00.000Z'),
        objectKey: OBJECT_KEY,
        scope: 'full',
        secret: SECRET,
      }),
    ).rejects.toThrow('Playback token asset does not match its immutable object key')
  })

  it('should prevent a preview token from authorizing full playback', async () => {
    const token = await createPlaybackToken({
      assetId: ASSET_ID,
      expiresAt: new Date('2026-08-22T01:15:00.000Z'),
      objectKey: OBJECT_KEY,
      scope: 'preview',
      secret: SECRET,
    })

    await expect(
      verifyPlaybackToken(token, {
        now: new Date('2026-08-22T01:00:00.000Z'),
        scope: 'full',
        secret: SECRET,
      }),
    ).resolves.toBeNull()
  })
})
