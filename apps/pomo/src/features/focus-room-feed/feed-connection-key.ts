import {type FeedUrlEnvironment, getFeedRequestUrl} from './feed-request-url'

const isTodayInHistoryPath = (pathname: string): boolean =>
  /^\/api\/feeds\/today-in-history\/(?:rss|atom)\.xml\/?$/iu.test(pathname)

/** Returns a comparable URL for an owned today-in-history feed. */
export const getFeedConnectionKey = (value: string, environment: FeedUrlEnvironment): string => {
  const requestUrl = getFeedRequestUrl(value, environment)
  let url: URL

  try {
    url = new URL(requestUrl, environment.localOrigin ?? environment.publicOrigin)
  } catch {
    return requestUrl
  }

  const isOwnedOrigin =
    url.origin === environment.localOrigin || url.origin === environment.publicOrigin

  if (!isOwnedOrigin || !isTodayInHistoryPath(url.pathname)) {
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
