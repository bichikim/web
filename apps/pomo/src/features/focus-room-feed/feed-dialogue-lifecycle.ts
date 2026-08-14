import type {FocusRoomDialogueRepository} from '../focus-room-dialogue/repository'
import type {FeedDialogueListItem} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import type {FeedItemRecord} from './feed-dialogue-schema'
import {findRemovableExpiredDialogues} from './feed-runtime'

interface DialogueDeleteRepository extends Pick<FocusRoomDialogueRepository, 'deleteDialogue'> {}

interface DialogueLookupRepository extends Pick<FocusRoomDialogueRepository, 'getDialogue'> {}

interface FeedDialogueDeleteRepository extends Pick<
  FeedDialogueRepository,
  'listExpiredMetadata' | 'removeMetadata'
> {}

interface FeedDialogueIssueRepository extends Pick<FeedDialogueRepository, 'listItems'> {}

interface FeedDialogueJobRepository extends Pick<
  FeedDialogueRepository,
  'deleteJobs' | 'listJobs'
> {}

interface FeedDialogueLookupRepository extends Pick<FeedDialogueRepository, 'listMetadata'> {}

export interface LoadFeedDialogueListOptions {
  readonly dialogueRepository: DialogueLookupRepository
  readonly feedRepository: FeedDialogueLookupRepository
}

export interface DeleteExpiredFeedDialoguesOptions {
  readonly dialogueRepository: DialogueDeleteRepository
  readonly feedRepository: FeedDialogueDeleteRepository
  readonly isDialogueScheduled: (dialogueId: string) => boolean
  readonly now: Date
}

export interface LoadFeedIssuesOptions {
  readonly connectionIds: ReadonlyArray<string>
  readonly feedRepository: FeedDialogueIssueRepository
}

export interface DiscardFeedJobsOptions {
  readonly connectionIds: ReadonlySet<string>
  readonly feedRepository: FeedDialogueJobRepository
  readonly updatedAt: string
}

/** Loads feed metadata joined with every dialogue record that is still available. */
export const loadFeedDialogueList = async (
  options: LoadFeedDialogueListOptions,
): Promise<ReadonlyArray<FeedDialogueListItem>> => {
  const metadata = await options.feedRepository.listMetadata()
  const loaded = await Promise.all(
    metadata.map(async (item) => ({
      dialogue: await options.dialogueRepository.getDialogue(item.dialogueId),
      metadata: item,
    })),
  )
  return loaded.flatMap((item) =>
    item.dialogue === null ? [] : [{dialogue: item.dialogue, metadata: item.metadata}],
  )
}

/** Loads failed or over-limit feed items in newest-first order. */
export const loadFeedIssues = async (
  options: LoadFeedIssuesOptions,
): Promise<ReadonlyArray<FeedItemRecord>> => {
  const itemGroups = await Promise.all(
    options.connectionIds.map((connectionId) => options.feedRepository.listItems(connectionId)),
  )
  return itemGroups
    .flat()
    .filter((item) => item.status === 'failed' || item.status === 'too-long')
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
}

/** Deletes unfinished jobs whose feed connection no longer exists. */
export const discardFeedJobs = async (options: DiscardFeedJobsOptions) => {
  const jobs = await options.feedRepository.listJobs()
  const jobIds = jobs
    .filter((job) => !options.connectionIds.has(job.feedConnectionId))
    .map((job) => job.id)

  if (jobIds.length > 0) {
    await options.feedRepository.deleteJobs(jobIds, options.updatedAt)
  }

  return jobIds
}

/** Deletes expired feed dialogue records that are not active or queued for playback. */
export const deleteExpiredFeedDialogues = async (options: DeleteExpiredFeedDialoguesOptions) => {
  const expired = await options.feedRepository.listExpiredMetadata(options.now.toISOString())
  const removable = findRemovableExpiredDialogues({
    expired,
    isDialogueScheduled: options.isDialogueScheduled,
  })

  await Promise.all(
    removable.map(async (metadata) => {
      await options.dialogueRepository.deleteDialogue(metadata.dialogueId)
      await options.feedRepository.removeMetadata(metadata.dialogueId)
    }),
  )
  return removable.length
}
