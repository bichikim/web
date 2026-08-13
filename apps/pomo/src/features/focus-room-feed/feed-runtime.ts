import type {SupertonicModelId} from '../supertonic'
import type {FeedDialogueMetadata} from './feed-dialogue-schema'

const FEED_REQUEST_TIMEOUT_MS = 15_000
const MAXIMUM_PROGRESS = 100

export const DEFAULT_FEED_MODEL_ID: SupertonicModelId = 'full'
export const FEED_POLLING_INTERVAL_MS = 60_000
export const getFeedGenerationProgress = (loadedBytes: number, totalBytes: number) =>
  Math.min(MAXIMUM_PROGRESS, Math.round((loadedBytes / totalBytes) * MAXIMUM_PROGRESS))
export const createFeedFetcher = () => (url: string) =>
  fetch(url, {cache: 'no-store', signal: AbortSignal.timeout(FEED_REQUEST_TIMEOUT_MS)})

export interface FindRemovableExpiredDialoguesOptions {
  readonly expired: ReadonlyArray<FeedDialogueMetadata>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
}

export const findRemovableExpiredDialogues = (options: FindRemovableExpiredDialoguesOptions) =>
  options.expired.filter((metadata) => !options.isDialogueScheduled(metadata.dialogueId))
