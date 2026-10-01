import {isOwnedTodayInHistoryFeedUrl} from './is-owned-today-in-history-feed-url'
import {type FeedUrlEnvironment, getFeedRequestUrl} from './feed-request-url'

/** Returns a comparable URL for an owned today-in-history feed. */
export const getFeedConnectionKey = (value: string, environment: FeedUrlEnvironment): string => {
  const requestUrl = getFeedRequestUrl(value, environment)
  let url: URL

  try {
    url = new URL(requestUrl, environment.localOrigin ?? environment.publicOrigin)
  } catch {
    return requestUrl
  }

  if (!isOwnedTodayInHistoryFeedUrl(url, environment)) {
    return requestUrl
  }

  url.pathname = url.pathname.toLowerCase()

  if (environment.publicOrigin !== undefined) {
    return new URL(
      `${url.pathname}${url.search}${url.hash}`,
      new URL(environment.publicOrigin).origin,
    ).href
  }

  return url.href
}
