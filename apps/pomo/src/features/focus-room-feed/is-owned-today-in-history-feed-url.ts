import type {FeedUrlEnvironment} from './feed-request-url'
export const isOwnedFeedOrigin = (url: URL, environment: FeedUrlEnvironment): boolean =>
  url.origin === environment.localOrigin || url.origin === environment.publicOrigin
export const isOwnedTodayInHistoryFeedUrl = (url: URL, environment: FeedUrlEnvironment): boolean =>
  isOwnedFeedOrigin(url, environment) &&
  /^\/api\/feeds\/today-in-history\/(?:rss|atom)\.xml\/?$/iu.test(url.pathname)
