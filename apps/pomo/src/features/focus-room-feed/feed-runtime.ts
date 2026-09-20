import {getDownloadPercentage} from 'src/features/download-progress'
import {getFeedRequestUrl} from './feed-request-url'
import {httpFetch} from '../http-client'
import type {FeedDialogueMetadata} from './feed-dialogue-schema'

const FEED_REQUEST_TIMEOUT_MS = 15_000

export const FEED_POLLING_INTERVAL_MS = 60_000
export const getFeedGenerationProgress = (loadedBytes: number, totalBytes: number) =>
  totalBytes > 0 ? getDownloadPercentage(loadedBytes, totalBytes) : 0
export const createFeedFetcher = () => (url: string) =>
  httpFetch(
    getFeedRequestUrl(url, {
      localOrigin: globalThis.location?.origin,
      publicOrigin: import.meta.env.VITE_POMO_PUBLIC_ORIGIN,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    {
      cache: 'no-store',
      signal: AbortSignal.timeout(FEED_REQUEST_TIMEOUT_MS),
    },
  )

export interface FindRemovableExpiredDialoguesOptions {
  readonly expired: ReadonlyArray<FeedDialogueMetadata>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
}

export const findRemovableExpiredDialogues = (options: FindRemovableExpiredDialoguesOptions) =>
  options.expired.filter((metadata) => !options.isDialogueScheduled(metadata.dialogueId))
