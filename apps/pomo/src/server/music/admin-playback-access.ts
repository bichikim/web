import {createPlaybackAccess, type PlaybackAccess, type PlaybackAsset} from './playback-access'
import {createTrackPlayback} from './track-upload'

interface AdminPlaybackEnvironment {
  readonly CLOUDFLARE_R2_ACCOUNT_ID?: string
  readonly POMO_AUDIO_GATEWAY_ORIGIN?: string
  readonly POMO_PAID_AUDIO_R2_ACCESS_KEY_ID?: string
  readonly POMO_PAID_AUDIO_R2_BUCKET?: string
  readonly POMO_PAID_AUDIO_R2_SECRET_ACCESS_KEY?: string
  readonly POMO_PLAYBACK_TOKEN_SECRET?: string
  readonly POMO_PUBLIC_ASSETS_R2_ACCESS_KEY_ID?: string
  readonly POMO_PUBLIC_ASSETS_R2_SECRET_ACCESS_KEY?: string
}

interface CreateAdminPlaybackOptions {
  readonly asset: PlaybackAsset
  readonly environment?: AdminPlaybackEnvironment
}

const hasGatewayConfiguration = (environment: AdminPlaybackEnvironment): boolean =>
  Boolean(
    environment.POMO_AUDIO_GATEWAY_ORIGIN?.trim() && environment.POMO_PLAYBACK_TOKEN_SECRET?.trim(),
  )

export const createAdminPlaybackAccess = async ({
  asset,
  environment = process.env,
}: CreateAdminPlaybackOptions): Promise<PlaybackAccess> => {
  if (hasGatewayConfiguration(environment)) {
    return createPlaybackAccess({asset, environment})
  }

  return createTrackPlayback(asset.objectKey, {environment})
}
