import {createPlaybackToken} from '@pomo/playback-token'

const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
// Keep leaked playback URLs useful only for a short player initialization window.
// oxlint-disable-next-line eslint/no-magic-numbers -- Fifteen-minute bearer URL lifetime.
const DEFAULT_PLAYBACK_TOKEN_SECONDS = 15 * SECONDS_PER_MINUTE

interface PlaybackEnvironment {
  readonly POMO_AUDIO_GATEWAY_ORIGIN?: string
  readonly POMO_PLAYBACK_TOKEN_SECRET?: string
}

export interface PlaybackAsset {
  readonly assetId: string
  readonly objectKey: string
}

export interface PlaybackAccess {
  readonly expiresAt: Date
  readonly url: string
}

interface CreatePlaybackAccessOptions {
  readonly asset: PlaybackAsset
  readonly environment?: PlaybackEnvironment
  readonly now?: Date
  readonly tokenSeconds?: number
}

const getGatewayOrigin = (environment: PlaybackEnvironment): string => {
  const configuredOrigin = environment.POMO_AUDIO_GATEWAY_ORIGIN?.trim()

  if (configuredOrigin === undefined || configuredOrigin.length === 0) {
    throw new TypeError('POMO_AUDIO_GATEWAY_ORIGIN is not set')
  }

  const {origin} = new URL(configuredOrigin)

  if (origin !== configuredOrigin.replace(/\/$/u, '')) {
    throw new TypeError('POMO_AUDIO_GATEWAY_ORIGIN must be an origin without a path')
  }

  return origin
}

const getPlaybackSecret = (environment: PlaybackEnvironment): string => {
  const secret = environment.POMO_PLAYBACK_TOKEN_SECRET?.trim()

  if (secret === undefined || secret.length === 0) {
    throw new TypeError('POMO_PLAYBACK_TOKEN_SECRET is not set')
  }

  return secret
}

export const createPlaybackAccess = async ({
  asset,
  environment = process.env,
  now = new Date(),
  tokenSeconds = DEFAULT_PLAYBACK_TOKEN_SECONDS,
}: CreatePlaybackAccessOptions): Promise<PlaybackAccess> => {
  if (!Number.isSafeInteger(tokenSeconds) || tokenSeconds <= 0) {
    throw new TypeError('Playback token duration must be a positive integer')
  }

  const expiresAt = new Date(now.getTime() + tokenSeconds * MILLISECONDS_PER_SECOND)
  const token = await createPlaybackToken({
    assetId: asset.assetId,
    expiresAt,
    objectKey: asset.objectKey,
    scope: 'full',
    secret: getPlaybackSecret(environment),
  })
  const url = new URL(`/tracks/${asset.assetId}/source.mp3`, getGatewayOrigin(environment))
  url.searchParams.set('token', token)

  return {expiresAt, url: url.toString()}
}
