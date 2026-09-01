import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {PDatabase} from '../../focus-room-dialogue/database'
import {
  type FeedDialogueJob,
  type FeedDialogueMetadata,
  type FeedItemRecord,
  getFeedItemRecordId,
} from '../feed-dialogue-schema'
import {
  createFeedDialogueRepository,
  type FailedFeedDialogueJob,
  type FailedFeedItemRecord,
} from '../feed-dialogue-repository'

const databaseModuleMocks = vi.hoisted(() => ({
  createPDatabase: vi.fn(),
}))

vi.mock('../../focus-room-dialogue/database', () => ({
  createPDatabase: databaseModuleMocks.createPDatabase,
}))

const metadataRangeToArray = vi.fn()
const metadataBelowOrEqual = vi.fn(() => ({toArray: metadataRangeToArray}))
const metadataWhere = vi.fn(() => ({belowOrEqual: metadataBelowOrEqual}))
const itemRangeToArray = vi.fn()
const itemEquals = vi.fn(() => ({toArray: itemRangeToArray}))
const itemWhere = vi.fn(() => ({equals: itemEquals}))
const orderedJobsToArray = vi.fn()
const jobOrderBy = vi.fn(() => ({toArray: orderedJobsToArray}))

const feedDialogueJobs = {
  bulkDelete: vi.fn(),
  bulkGet: vi.fn(),
  bulkPut: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
  orderBy: jobOrderBy,
  put: vi.fn(),
  toArray: vi.fn(),
}
const dialogues = {
  delete: vi.fn(),
}
const eventBindings = {
  delete: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
}
const feedDialogueMetadata = {
  delete: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  toArray: vi.fn(),
  where: metadataWhere,
}
const feedItems = {
  bulkGet: vi.fn(),
  bulkPut: vi.fn(),
  delete: vi.fn(),
  put: vi.fn(),
  where: itemWhere,
}
const database = {
  close: vi.fn(),
  dialogues,
  eventBindings,
  feedDialogueJobs,
  feedDialogueMetadata,
  feedItems,
  transaction: vi.fn(async (...arguments_: ReadonlyArray<unknown>) => {
    const callback = arguments_.at(-1) as () => Promise<unknown>
    return callback()
  }),
} as unknown as PDatabase

const CREATED_AT = '2026-08-25T00:00:00.000Z'
const UPDATED_AT = '2026-08-25T01:00:00.000Z'

const createJob = (overrides: Partial<FeedDialogueJob> = {}): FeedDialogueJob => ({
  createdAt: CREATED_AT,
  errorMessage: null,
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: 'job-1',
  itemTitle: '새 글',
  modelId: 'int8',
  publishedAt: CREATED_AT,
  script: '읽을 대본',
  sourceTitle: '소식지',
  sourceUrl: 'https://example.com/item-1',
  status: 'queued',
  updatedAt: CREATED_AT,
  version: 1,
  voiceId: 'M1',
  ...overrides,
})

const createItem = (overrides: Partial<FeedItemRecord> = {}): FeedItemRecord => ({
  contentLength: 10,
  discoveredAt: CREATED_AT,
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: getFeedItemRecordId('feed-1', 'item-1'),
  itemTitle: '새 글',
  message: null,
  publishedAt: CREATED_AT,
  sourceTitle: '소식지',
  sourceUrl: 'https://example.com/item-1',
  status: 'queued',
  updatedAt: CREATED_AT,
  version: 1,
  ...overrides,
})

const createMetadata = (overrides: Partial<FeedDialogueMetadata> = {}): FeedDialogueMetadata => ({
  createdAt: CREATED_AT,
  dialogueId: 'dialogue-1',
  expiresAt: '2026-08-27T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  itemTitle: '새 글',
  listenedAt: null,
  publishedAt: CREATED_AT,
  sourceTitle: '소식지',
  sourceUrl: 'https://example.com/item-1',
  version: 1,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  databaseModuleMocks.createPDatabase.mockReturnValue(database)
})

describe('feed dialogue repository writes', () => {
  it('should complete a dialogue and remove its generation job transactionally', async () => {
    const repository = createFeedDialogueRepository()
    const item = createItem({status: 'ready'})
    const metadata = createMetadata()

    await repository.complete({item, jobId: 'job-1', metadata})

    expect(feedDialogueMetadata.put).toHaveBeenCalledWith(metadata)
    expect(feedItems.put).toHaveBeenCalledWith(item)
    expect(feedDialogueJobs.delete).toHaveBeenCalledWith('job-1')
    expect(database.transaction).toHaveBeenCalledOnce()
  })

  it('should queue and update a job together with its item when provided', async () => {
    const repository = createFeedDialogueRepository()
    const item = createItem()
    const queuedJob = createJob()
    const generatingJob = createJob({status: 'generating', updatedAt: UPDATED_AT})

    await repository.queue(queuedJob, item)
    await repository.updateJob(generatingJob, createItem({status: 'ready'}))

    expect(feedDialogueJobs.put).toHaveBeenNthCalledWith(1, queuedJob)
    expect(feedDialogueJobs.put).toHaveBeenNthCalledWith(2, generatingJob)
    expect(feedItems.put).toHaveBeenCalledTimes(2)
    expect(database.transaction).toHaveBeenCalledTimes(2)
  })

  it('should fail only a job that is still generating', async () => {
    const repository = createFeedDialogueRepository()
    const failedJob: FailedFeedDialogueJob = {
      ...createJob(),
      errorMessage: '실패',
      status: 'failed',
      updatedAt: UPDATED_AT,
    }
    const failedItem: FailedFeedItemRecord = {
      ...createItem(),
      message: '실패',
      status: 'failed',
      updatedAt: UPDATED_AT,
    }
    feedDialogueJobs.get.mockResolvedValue(createJob({status: 'generating'}))

    await expect(repository.failJob({item: failedItem, job: failedJob})).resolves.toBe(true)

    expect(feedDialogueJobs.put).toHaveBeenCalledWith(failedJob)
    expect(feedItems.put).toHaveBeenCalledWith(failedItem)
  })

  it('should preserve an interrupted or missing job instead of failing it', async () => {
    const repository = createFeedDialogueRepository()
    const failedJob: FailedFeedDialogueJob = {
      ...createJob(),
      errorMessage: '실패',
      status: 'failed',
      updatedAt: UPDATED_AT,
    }
    feedDialogueJobs.get
      .mockResolvedValueOnce(createJob({status: 'interrupted'}))
      .mockResolvedValueOnce(undefined)

    await expect(repository.failJob({job: failedJob})).resolves.toBe(false)
    await expect(repository.failJob({job: failedJob})).resolves.toBe(false)

    expect(feedDialogueJobs.put).not.toHaveBeenCalled()
    expect(feedItems.put).not.toHaveBeenCalled()
  })

  it('should replace a dialogue without audio with a queued recovery job transactionally', async () => {
    const repository = createFeedDialogueRepository()
    const item = createItem()
    const job = createJob()
    feedDialogueMetadata.get.mockResolvedValue(createMetadata())
    eventBindings.get.mockImplementation((event: string) =>
      event === 'focus-start'
        ? {
            dialogueIds: ['dialogue-1', 'other'],
            event,
            playbackMode: 'sequential-all',
            version: 3,
          }
        : undefined,
    )

    await expect(
      repository.recoverMissingDialogue({dialogueId: 'dialogue-1', item, job}),
    ).resolves.toBe(true)

    expect(dialogues.delete).toHaveBeenCalledWith('dialogue-1')
    expect(eventBindings.put).toHaveBeenCalledWith({
      dialogueIds: ['other'],
      event: 'focus-start',
      playbackMode: 'sequential-all',
      version: 3,
    })
    expect(feedDialogueMetadata.delete).toHaveBeenCalledWith('dialogue-1')
    expect(feedDialogueJobs.put).toHaveBeenCalledWith(job)
    expect(feedItems.put).toHaveBeenCalledWith(item)
    expect(database.transaction).toHaveBeenCalledOnce()
  })

  it('should skip recovery when another request already removed the dialogue metadata', async () => {
    const repository = createFeedDialogueRepository()
    feedDialogueMetadata.get.mockResolvedValue(undefined)

    await expect(
      repository.recoverMissingDialogue({
        dialogueId: 'dialogue-1',
        item: createItem(),
        job: createJob(),
      }),
    ).resolves.toBe(false)

    expect(dialogues.delete).not.toHaveBeenCalled()
    expect(feedDialogueJobs.put).not.toHaveBeenCalled()
    expect(feedItems.put).not.toHaveBeenCalled()
  })

  it('should reject recovery when the replacement job targets different feed metadata', async () => {
    const repository = createFeedDialogueRepository()
    feedDialogueMetadata.get.mockResolvedValue(createMetadata({feedItemId: 'other-item'}))

    await expect(
      repository.recoverMissingDialogue({
        dialogueId: 'dialogue-1',
        item: createItem(),
        job: createJob(),
      }),
    ).rejects.toThrow('복구할 피드 대화와 생성 작업이 일치하지 않아요.')

    expect(dialogues.delete).not.toHaveBeenCalled()
    expect(feedDialogueMetadata.delete).not.toHaveBeenCalled()
    expect(feedDialogueJobs.put).not.toHaveBeenCalled()
  })

  it('should reject recovery when the replacement item targets a different feed item', async () => {
    const repository = createFeedDialogueRepository()
    feedDialogueMetadata.get.mockResolvedValue(createMetadata())

    await expect(
      repository.recoverMissingDialogue({
        dialogueId: 'dialogue-1',
        item: createItem({feedItemId: 'other-item', id: 'feed-1\0other-item'}),
        job: createJob(),
      }),
    ).rejects.toThrow('복구할 피드 대화와 생성 작업이 일치하지 않아요.')

    expect(dialogues.delete).not.toHaveBeenCalled()
    expect(feedDialogueMetadata.delete).not.toHaveBeenCalled()
    expect(feedDialogueJobs.put).not.toHaveBeenCalled()
  })

  it('should update only the job when an item is omitted', async () => {
    const repository = createFeedDialogueRepository()
    const job = createJob({status: 'failed'})

    await repository.updateJob(job)

    expect(feedDialogueJobs.put).toHaveBeenCalledWith(job)
    expect(feedItems.put).not.toHaveBeenCalled()
    expect(database.transaction).not.toHaveBeenCalled()
  })

  it('should save and remove records and close the database', async () => {
    const repository = createFeedDialogueRepository()
    const items = [createItem(), createItem({feedItemId: 'item-2', id: 'feed-1\0item-2'})]

    await repository.saveItems(items)
    await repository.removeItem('feed-1', 'item-2')
    await repository.removeMetadata('dialogue-1')
    repository.dispose()

    expect(feedItems.bulkPut).toHaveBeenCalledWith(items)
    expect(feedItems.delete).toHaveBeenCalledWith('feed-1\0item-2')
    expect(feedDialogueMetadata.delete).toHaveBeenCalledWith('dialogue-1')
    expect(database.close).toHaveBeenCalledOnce()
  })
})

describe('feed dialogue repository reads and recovery', () => {
  it('should read each indexed collection and sort metadata newest first', async () => {
    const repository = createFeedDialogueRepository()
    const job = createJob()
    const item = createItem()
    const oldMetadata = createMetadata()
    const newMetadata = createMetadata({
      createdAt: UPDATED_AT,
      dialogueId: 'dialogue-2',
      feedItemId: 'item-2',
    })
    metadataRangeToArray.mockResolvedValue([oldMetadata])
    itemRangeToArray.mockResolvedValue([item])
    orderedJobsToArray.mockResolvedValue([job])
    feedDialogueMetadata.toArray.mockResolvedValue([oldMetadata, newMetadata])

    await expect(repository.listExpiredMetadata(UPDATED_AT)).resolves.toEqual([oldMetadata])
    await expect(repository.listItems('feed-1')).resolves.toEqual([item])
    await expect(repository.listJobs()).resolves.toEqual([job])
    await expect(repository.listMetadata()).resolves.toEqual([newMetadata, oldMetadata])
    expect(metadataWhere).toHaveBeenCalledWith('expiresAt')
    expect(metadataBelowOrEqual).toHaveBeenCalledWith(UPDATED_AT)
    expect(itemWhere).toHaveBeenCalledWith('feedConnectionId')
    expect(itemEquals).toHaveBeenCalledWith('feed-1')
    expect(jobOrderBy).toHaveBeenCalledWith('updatedAt')
  })

  it('should mark existing metadata listened and ignore a missing record', async () => {
    const repository = createFeedDialogueRepository()
    const metadata = createMetadata()
    feedDialogueMetadata.get.mockResolvedValueOnce(undefined).mockResolvedValueOnce(metadata)

    await repository.markListened('missing-dialogue', UPDATED_AT)
    await repository.markListened(metadata.dialogueId, UPDATED_AT)

    expect(feedDialogueMetadata.put).toHaveBeenCalledOnce()
    expect(feedDialogueMetadata.put).toHaveBeenCalledWith({...metadata, listenedAt: UPDATED_AT})
  })

  it('should interrupt only queued and generating jobs', async () => {
    const repository = createFeedDialogueRepository()
    const queued = createJob()
    const generating = createJob({id: 'job-2', status: 'generating'})
    const failed = createJob({id: 'job-3', status: 'failed'})
    feedDialogueJobs.toArray.mockResolvedValue([queued, generating, failed])

    await expect(repository.interruptUnfinishedJobs(UPDATED_AT)).resolves.toEqual([
      {...queued, status: 'interrupted', updatedAt: UPDATED_AT},
      {...generating, status: 'interrupted', updatedAt: UPDATED_AT},
      failed,
    ])
    expect(feedDialogueJobs.bulkPut).toHaveBeenCalledWith([
      {...queued, status: 'interrupted', updatedAt: UPDATED_AT},
      {...generating, status: 'interrupted', updatedAt: UPDATED_AT},
      failed,
    ])
  })

  it('should retry stored jobs while skipping missing job identifiers', async () => {
    const repository = createFeedDialogueRepository()
    const failed = createJob({errorMessage: '실패', status: 'failed'})
    feedDialogueJobs.bulkGet.mockResolvedValue([failed, undefined])

    await repository.retryJobs(['job-1', 'missing-job'], UPDATED_AT)

    expect(feedDialogueJobs.bulkPut).toHaveBeenCalledWith([
      {...failed, errorMessage: null, status: 'queued', updatedAt: UPDATED_AT},
    ])
  })

  it('should delete stored jobs and dismiss only their existing feed items', async () => {
    const repository = createFeedDialogueRepository()
    const failed = createJob({errorMessage: '실패', status: 'failed'})
    const item = createItem({message: '실패', status: 'failed'})
    feedDialogueJobs.bulkGet.mockResolvedValue([failed, undefined])
    feedItems.bulkGet.mockResolvedValue([item, undefined])

    await repository.deleteJobs(['job-1', 'missing-job'], UPDATED_AT)

    expect(feedDialogueJobs.bulkDelete).toHaveBeenCalledWith(['job-1'])
    expect(feedItems.bulkGet).toHaveBeenCalledWith([getFeedItemRecordId('feed-1', 'item-1')])
    expect(feedItems.bulkPut).toHaveBeenCalledWith([
      {
        ...item,
        message: '사용자가 음성 생성을 삭제했어요.',
        status: 'dismissed',
        updatedAt: UPDATED_AT,
      },
    ])
  })
})
