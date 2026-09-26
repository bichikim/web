export interface FeedUrlEnvironment {
  readonly localOrigin?: string
  readonly publicOrigin?: string
  readonly timeZone: string
}

/** Adds the supplied viewer time zone only to owned date-sensitive feeds. */
export const getFeedRequestUrl = (value: string, environment: FeedUrlEnvironment): string => {
  const {localOrigin, publicOrigin, timeZone} = environment
  const base = localOrigin ?? publicOrigin
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    return value
  }
  const ownedOrigin = url.origin === localOrigin || url.origin === publicOrigin
  const dateSensitive =
    /^\/api\/feeds\/today-in-history\/(?:rss|atom)\.xml\/?$/u.test(url.pathname) ||
    /^\/__dev\/feeds\/(?:rss|atom)\.xml\/?$/u.test(url.pathname)
  if (!ownedOrigin || !dateSensitive) {
    return value
  }
  url.searchParams.set('timeZone', timeZone)
  return url.href
}
