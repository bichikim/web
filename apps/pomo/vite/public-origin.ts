interface PublicOriginEnvironment {
  readonly POMO_PUBLIC_ORIGIN?: string
}

const DEFAULT_PUBLIC_ORIGIN = 'https://www.pomofi.io'

export const resolvePublicOrigin = (environment: PublicOriginEnvironment): string => {
  const value = environment.POMO_PUBLIC_ORIGIN?.trim() || DEFAULT_PUBLIC_ORIGIN
  let url: URL

  try {
    url = new URL(value)
  } catch (cause) {
    throw new TypeError('POMO_PUBLIC_ORIGIN must be an absolute HTTP or HTTPS URL.', {cause})
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('POMO_PUBLIC_ORIGIN must be an absolute HTTP or HTTPS URL.')
  }

  return url.origin
}
