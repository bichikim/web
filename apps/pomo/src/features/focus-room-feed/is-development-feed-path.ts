const DEVELOPMENT_FEED_PATHS = new Set(['/__dev/feeds/atom.xml', '/__dev/feeds/rss.xml'])

/** Matches an exact development-feed pathname without normalizing it. */
export const isDevelopmentFeedPath = (pathname: string): boolean =>
  DEVELOPMENT_FEED_PATHS.has(pathname)
