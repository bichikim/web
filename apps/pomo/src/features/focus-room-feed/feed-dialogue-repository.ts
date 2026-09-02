import {createPDatabase, type PDatabase} from '../focus-room-dialogue/database'
import {deleteDialogueRecord} from '../focus-room-dialogue/dialogue-record'
import {
  type FeedDialogueJob,
  feedDialogueJobSchema,
  type FeedDialogueMetadata,
  feedDialogueMetadataSchema,
  type FeedItemRecord,
  feedItemRecordSchema,
  getFeedItemRecordId,
} from './feed-dialogue-schema'

export interface CompleteFeedDialogueOptions {
  readonly item: FeedItemRecord
  readonly jobId: string
  readonly metadata: FeedDialogueMetadata
}

export interface RecoverMissingDialogueOptions {
  readonly dialogueId: string
  readonly item: FeedItemRecord
  readonly job: FeedDialogueJob
}

export interface FailedFeedDialogueJob extends FeedDialogueJob {
  readonly status: 'failed'
}

export interface FailedFeedItemRecord extends FeedItemRecord {
  readonly status: 'failed'
}

export interface FailFeedDialogueJobOptions {
  readonly item?: FailedFeedItemRecord
  readonly job: FailedFeedDialogueJob
}

export interface GeneratingFeedDialogueJob extends FeedDialogueJob {
  readonly status: 'generating'
}

export interface FeedDialogueRepository {
  readonly complete: (options: CompleteFeedDialogueOptions) => Promise<void>
  readonly deleteJobs: (jobIds: ReadonlyArray<string>, updatedAt: string) => Promise<void>
  readonly dispose: () => void
  readonly failJob: (options: FailFeedDialogueJobOptions) => Promise<boolean>
  readonly interruptUnfinishedJobs: (updatedAt: string) => Promise<ReadonlyArray<FeedDialogueJob>>
  readonly listExpiredMetadata: (expiresAt: string) => Promise<ReadonlyArray<FeedDialogueMetadata>>
  readonly listItems: (feedConnectionId: string) => Promise<ReadonlyArray<FeedItemRecord>>
  readonly listJobs: () => Promise<ReadonlyArray<FeedDialogueJob>>
  readonly listMetadata: () => Promise<ReadonlyArray<FeedDialogueMetadata>>
  readonly markListened: (dialogueId: string, listenedAt: string) => Promise<void>
  readonly queue: (job: FeedDialogueJob, item: FeedItemRecord) => Promise<void>
  readonly recoverMissingDialogue: (options: RecoverMissingDialogueOptions) => Promise<boolean>
  readonly removeMetadata: (dialogueId: string) => Promise<void>
  readonly removeItem: (feedConnectionId: string, feedItemId: string) => Promise<void>
  readonly retryJobs: (jobIds: ReadonlyArray<string>, updatedAt: string) => Promise<void>
  readonly saveItems: (items: ReadonlyArray<FeedItemRecord>) => Promise<void>
  readonly startJob: (job: GeneratingFeedDialogueJob) => Promise<boolean>
}

const parseJobs = (values: ReadonlyArray<unknown>) =>
  values.map((value) => feedDialogueJobSchema.parse(value))
const parseItems = (values: ReadonlyArray<unknown>) =>
  values.map((value) => feedItemRecordSchema.parse(value))
const parseMetadata = (values: ReadonlyArray<unknown>) =>
  values.map((value) => feedDialogueMetadataSchema.parse(value))

const updateRecoverableJobs = async (
  database: PDatabase,
  jobIds: ReadonlyArray<string>,
  updatedAt: string,
  status: 'dismissed' | 'queued',
) => {
  const storedJobs = await database.feedDialogueJobs.bulkGet([...jobIds])
  const jobs = storedJobs
    .filter((value): value is unknown => value !== undefined)
    .map((value) => feedDialogueJobSchema.parse(value))

  await database.transaction('rw', database.feedDialogueJobs, database.feedItems, async () => {
    if (status === 'queued') {
      await database.feedDialogueJobs.bulkPut(
        jobs.map((job) => ({...job, errorMessage: null, status, updatedAt})),
      )
      return
    }

    await database.feedDialogueJobs.bulkDelete(jobs.map((job) => job.id))
    const storedItems = await database.feedItems.bulkGet(
      jobs.map((job) => getFeedItemRecordId(job.feedConnectionId, job.feedItemId)),
    )
    const items = storedItems
      .filter((value): value is unknown => value !== undefined)
      .map((value) => feedItemRecordSchema.parse(value))
      .map((item) => ({...item, message: '사용자가 음성 생성을 삭제했어요.', status, updatedAt}))
    await database.feedItems.bulkPut(items)
  })
}

const failGeneratingJob = async (database: PDatabase, options: FailFeedDialogueJobOptions) => {
  const nextJob = feedDialogueJobSchema.parse(options.job)
  const nextItem = options.item === undefined ? undefined : feedItemRecordSchema.parse(options.item)

  return database.transaction('rw', database.feedDialogueJobs, database.feedItems, async () => {
    const storedValue = await database.feedDialogueJobs.get(nextJob.id)

    if (storedValue === undefined) {
      return false
    }

    const storedJob = feedDialogueJobSchema.parse(storedValue)

    if (storedJob.status !== 'generating') {
      return false
    }

    await database.feedDialogueJobs.put(nextJob)

    if (nextItem !== undefined) {
      await database.feedItems.put(nextItem)
    }

    return true
  })
}

const startQueuedJob = async (database: PDatabase, job: GeneratingFeedDialogueJob) => {
  const nextJob = feedDialogueJobSchema.parse(job)

  if (nextJob.status !== 'generating') {
    throw new Error('시작할 피드 생성 작업 상태가 올바르지 않아요.')
  }

  return database.transaction('rw', database.feedDialogueJobs, async () => {
    const storedValue = await database.feedDialogueJobs.get(nextJob.id)

    if (storedValue === undefined) {
      return false
    }

    const storedJob = feedDialogueJobSchema.parse(storedValue)

    if (storedJob.status !== 'queued') {
      return false
    }

    await database.feedDialogueJobs.put(nextJob)
    return true
  })
}

/** Persists feed discovery and generation state beside compatible dialogue records. */
export const createFeedDialogueRepository = (): FeedDialogueRepository => {
  const database = createPDatabase()

  return {
    async complete(options) {
      const metadata = feedDialogueMetadataSchema.parse(options.metadata)
      const item = feedItemRecordSchema.parse(options.item)

      return database.transaction(
        'rw',
        database.feedDialogueJobs,
        database.feedDialogueMetadata,
        database.feedItems,
        async () => {
          await database.feedDialogueMetadata.put(metadata)
          await database.feedItems.put(item)
          await database.feedDialogueJobs.delete(options.jobId)
        },
      )
    },
    deleteJobs: (jobIds, updatedAt) =>
      updateRecoverableJobs(database, jobIds, updatedAt, 'dismissed'),
    dispose() {
      database.close()
    },
    failJob: (options) => failGeneratingJob(database, options),
    async interruptUnfinishedJobs(updatedAt) {
      const values = await database.feedDialogueJobs.toArray()
      const jobs = parseJobs(values)
      const interrupted = jobs.map((job) =>
        job.status === 'generating' || job.status === 'queued'
          ? {...job, status: 'interrupted' as const, updatedAt}
          : job,
      )

      await database.feedDialogueJobs.bulkPut(interrupted)
      return interrupted
    },
    async listExpiredMetadata(expiresAt) {
      const values = await database.feedDialogueMetadata
        .where('expiresAt')
        .belowOrEqual(expiresAt)
        .toArray()
      return parseMetadata(values)
    },
    async listItems(feedConnectionId) {
      const values = await database.feedItems
        .where('feedConnectionId')
        .equals(feedConnectionId)
        .toArray()
      return parseItems(values)
    },
    async listJobs() {
      return parseJobs(await database.feedDialogueJobs.orderBy('updatedAt').toArray())
    },
    async listMetadata() {
      const metadata = parseMetadata(await database.feedDialogueMetadata.toArray())
      return metadata.sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )
    },
    async markListened(dialogueId, listenedAt) {
      const value = await database.feedDialogueMetadata.get(dialogueId)

      if (value === undefined) {
        return
      }

      const metadata = feedDialogueMetadataSchema.parse(value)
      await database.feedDialogueMetadata.put({...metadata, listenedAt})
    },
    async queue(job, item) {
      const nextJob = feedDialogueJobSchema.parse(job)
      const nextItem = feedItemRecordSchema.parse(item)
      await database.transaction('rw', database.feedDialogueJobs, database.feedItems, async () => {
        await database.feedDialogueJobs.put(nextJob)
        await database.feedItems.put(nextItem)
      })
    },
    async recoverMissingDialogue(options) {
      const nextJob = feedDialogueJobSchema.parse(options.job)
      const nextItem = feedItemRecordSchema.parse(options.item)

      return database.transaction(
        'rw',
        database.dialogues,
        database.eventBindings,
        database.feedDialogueJobs,
        database.feedDialogueMetadata,
        database.feedItems,
        async () => {
          const storedMetadata = await database.feedDialogueMetadata.get(options.dialogueId)

          if (storedMetadata === undefined) {
            return false
          }

          const metadata = feedDialogueMetadataSchema.parse(storedMetadata)

          if (
            metadata.feedConnectionId !== nextJob.feedConnectionId ||
            metadata.feedItemId !== nextJob.feedItemId ||
            nextItem.feedConnectionId !== nextJob.feedConnectionId ||
            nextItem.feedItemId !== nextJob.feedItemId ||
            nextItem.id !== getFeedItemRecordId(nextJob.feedConnectionId, nextJob.feedItemId)
          ) {
            throw new Error('복구할 피드 대화와 생성 작업이 일치하지 않아요.')
          }

          await deleteDialogueRecord(database, options.dialogueId)
          await database.feedDialogueMetadata.delete(options.dialogueId)
          await database.feedDialogueJobs.put(nextJob)
          await database.feedItems.put(nextItem)
          return true
        },
      )
    },
    async removeItem(feedConnectionId, feedItemId) {
      await database.feedItems.delete(getFeedItemRecordId(feedConnectionId, feedItemId))
    },
    async removeMetadata(dialogueId) {
      await database.feedDialogueMetadata.delete(dialogueId)
    },
    retryJobs: (jobIds, updatedAt) => updateRecoverableJobs(database, jobIds, updatedAt, 'queued'),
    async saveItems(items) {
      await database.feedItems.bulkPut(items.map((item) => feedItemRecordSchema.parse(item)))
    },
    startJob: (job) => startQueuedJob(database, job),
  }
}
