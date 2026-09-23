import {getDownloadPercentage} from 'src/features/download-progress'
import {getFeedRequestUrl} from './feed-request-url'
import {httpFetch} from '../http-client'
import type {FeedDialogueMetadata} from './feed-dialogue-schema'

const FEED_REQUEST_TIMEOUT_MS = 15_000

export const FEED_POLLING_INTERVAL_MS = 60_000
const DEV_FEED_PATHS = new Set(['/__dev/feeds/atom.xml', '/__dev/feeds/rss.xml'])

export const getFeedGenerationProgress = (loadedBytes: number, totalBytes: number) =>
  totalBytes > 0 ? getDownloadPercentage(loadedBytes, totalBytes) : 0

const resolveDesktopDevelopmentFeedUrl = (url: string, localOrigin: string | undefined): string => {
  if (
    import.meta.env.DEV !== true ||
    import.meta.env.VITE_POMO_IS_DESKTOP !== 'true' ||
    localOrigin === undefined
  ) {
    return url
  }

  try {
    const parsedUrl = new URL(url)
    if (
      !DEV_FEED_PATHS.has(parsedUrl.pathname) ||
      (parsedUrl.origin !== localOrigin &&
        parsedUrl.origin !== import.meta.env.VITE_POMO_PUBLIC_ORIGIN)
    ) {
      return url
    }

    const localUrl = new URL(parsedUrl.pathname, localOrigin)
    localUrl.search = parsedUrl.search
    localUrl.hash = parsedUrl.hash
    return localUrl.href
  } catch {
    return url
  }
}

export const createFeedFetcher = () => (url: string) => {
  const localOrigin = globalThis.location?.origin
  const requestUrl = getFeedRequestUrl(resolveDesktopDevelopmentFeedUrl(url, localOrigin), {
    localOrigin,
    publicOrigin: import.meta.env.VITE_POMO_PUBLIC_ORIGIN,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })

  return httpFetch(requestUrl, {
    cache: 'no-store',
    signal: AbortSignal.timeout(FEED_REQUEST_TIMEOUT_MS),
  })
}

export interface FindRemovableExpiredDialoguesOptions {
  readonly expired: ReadonlyArray<FeedDialogueMetadata>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
}

export const findRemovableExpiredDialogues = (options: FindRemovableExpiredDialoguesOptions) =>
  options.expired.filter((metadata) => !options.isDialogueScheduled(metadata.dialogueId))
