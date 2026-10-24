import {isOwnedFeedOrigin, isOwnedTodayInHistoryFeedUrl} from './is-owned-today-in-history-feed-url'
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
  const ownedOrigin = isOwnedFeedOrigin(url, environment)
  const dateSensitive =
    isOwnedTodayInHistoryFeedUrl(url, environment) ||
    /^\/__dev\/feeds\/(?:rss|atom)\.xml\/?$/iu.test(url.pathname)
  if (!ownedOrigin || !dateSensitive) {
    return value
  }
  url.searchParams.set('timeZone', timeZone)
  return url.href
}
