import {createPlaybackToken, verifyPlaybackToken} from '@pomo/playback-token'

import type {PlaybackAsset} from './playback-access'

const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
// A copied preview URL should stop working shortly after player initialization.
// oxlint-disable-next-line eslint/no-magic-numbers -- Five-minute preview URL lifetime.
const DEFAULT_PREVIEW_TOKEN_SECONDS = 5 * SECONDS_PER_MINUTE

interface PreviewEnvironment {
  readonly POMO_PLAYBACK_TOKEN_SECRET?: string
}

interface CreatePreviewAccessOptions {
  readonly asset: PlaybackAsset
  readonly environment?: PreviewEnvironment
  readonly now?: Date
  readonly tokenSeconds?: number
  readonly trackId: string
}

interface VerifyPreviewAccessOptions {
  readonly environment?: PreviewEnvironment
  readonly now?: Date
  readonly token: string
}

export interface PreviewAccess {
  readonly expiresAt: Date
  readonly url: string
}

const getPlaybackSecret = (environment: PreviewEnvironment): string => {
  const secret = environment.POMO_PLAYBACK_TOKEN_SECRET?.trim()

  if (secret === undefined || secret.length === 0) {
    throw new TypeError('POMO_PLAYBACK_TOKEN_SECRET is not set')
  }

  return secret
}

export const createPreviewAccess = async ({
  asset,
  environment = process.env,
  now = new Date(),
  tokenSeconds = DEFAULT_PREVIEW_TOKEN_SECONDS,
  trackId,
}: CreatePreviewAccessOptions): Promise<PreviewAccess> => {
  if (!Number.isSafeInteger(tokenSeconds) || tokenSeconds <= 0) {
    throw new TypeError('Preview token duration must be a positive integer')
  }

  const expiresAt = new Date(now.getTime() + tokenSeconds * MILLISECONDS_PER_SECOND)
  const token = await createPlaybackToken({
    assetId: asset.assetId,
    expiresAt,
    objectKey: asset.objectKey,
    scope: 'preview',
    secret: getPlaybackSecret(environment),
  })
  const url = new URL(`/api/music/tracks/${trackId}/preview`, 'https://www.pomofi.io')
  url.searchParams.set('asset', asset.assetId)
  url.searchParams.set('token', token)

  return {expiresAt, url: `${url.pathname}${url.search}`}
}

export const verifyPreviewAccess = async ({
  environment = process.env,
  now,
  token,
}: VerifyPreviewAccessOptions): Promise<PlaybackAsset | null> => {
  const claims = await verifyPlaybackToken(token, {
    now,
    scope: 'preview',
    secret: getPlaybackSecret(environment),
  })

  return claims === null ? null : {assetId: claims.assetId, objectKey: claims.objectKey}
}
