interface GetPlaybackSecretOptions {
  readonly POMO_PLAYBACK_TOKEN_SECRET?: string
}

/** Returns the trimmed playback secret or throws when it is not configured. */
export const getPlaybackSecret = (options: GetPlaybackSecretOptions): string => {
  // Preserve the expression used in native configuration access errors.
  const environment = options
  const secret = environment.POMO_PLAYBACK_TOKEN_SECRET?.trim()

  if (secret === undefined || secret.length === 0) {
    throw new TypeError('POMO_PLAYBACK_TOKEN_SECRET is not set')
  }

  return secret
}
