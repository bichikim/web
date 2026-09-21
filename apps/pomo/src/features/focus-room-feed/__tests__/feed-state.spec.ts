/** @vitest-environment node */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {PDialogue} from '../../focus-room-dialogue'
import type {PDialogueRepository} from '../../focus-room-dialogue/repository'
import {createFeedStateController} from '../feed-state'
import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {FeedDialogueMetadata} from '../feed-dialogue-schema'
import type {FeedDialogueListItem} from '../feed-controller'

const LISTENED_AT = '2026-08-14T01:00:00.000Z'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'int8',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const createMetadata = (listenedAt: string | null): FeedDialogueMetadata => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  dialogueId: DIALOGUE.id,
  expiresAt: '2026-08-16T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  itemTitle: '새 피드',
  listenedAt,
  publishedAt: '2026-08-14T00:00:00.000Z',
  sourceTitle: '테스트 피드',
  sourceUrl: 'https://example.com/item-1',
  version: 1,
})

const createListItem = (listenedAt: string | null): FeedDialogueListItem => ({
  dialogue: DIALOGUE,
  metadata: createMetadata(listenedAt),
})

interface CreateRepositoriesOptions {
  readonly getDialogue: PDialogueRepository['getDialogue']
  readonly metadata: FeedDialogueMetadata
}

const createRepositories = ({getDialogue, metadata}: CreateRepositoriesOptions) => {
  const dialogueRepository = {
    deleteDialogue: vi.fn(),
    dispose: vi.fn(),
    getAudio: vi.fn(),
    getDialogue,
    listDialogues: vi.fn(),
    listEventBindings: vi.fn(),
    saveDialogue: vi.fn(),
    setEntryBinding: vi.fn(),
    setEventBinding: vi.fn(),
  } satisfies PDialogueRepository
  const feedRepository = {
    complete: vi.fn(),
    deleteJobs: vi.fn(),
    dispose: vi.fn(),
    failJob: vi.fn(),
    interruptUnfinishedJobs: vi.fn(),
    listExpiredMetadata: vi.fn(),
    listItems: vi.fn(),
    listJobs: vi.fn(),
    listMetadata: vi.fn(async () => [metadata]),
    markListened: vi.fn(),
    queue: vi.fn(),
    recoverMissingDialogue: vi.fn(),
    removeItem: vi.fn(),
    removeMetadata: vi.fn(),
    retryJobs: vi.fn(),
    saveItems: vi.fn(),
    startJob: vi.fn(),
  } satisfies FeedDialogueRepository

  return {dialogueRepository, feedRepository}
}

const createController = (repositories: ReturnType<typeof createRepositories>) =>
  createFeedStateController({
    events: {
      deleteDialogue: vi.fn(),
      isDialogueScheduled: vi.fn(() => false),
      refreshDialogues: vi.fn(),
    },
    getRepositories: () => repositories,
    listConnections: () => [],
    now: () => new Date('2026-08-14T01:00:00.000Z'),
  })

it('should preserve a listened mark when a reload resolves with stale metadata', async () => {
  const dialogueLoad = Promise.withResolvers<PDialogue>()
  const getDialogue = vi.fn(() => dialogueLoad.promise)

  await createRoot(async (dispose) => {
    try {
      const controller = createController(
        createRepositories({getDialogue, metadata: createMetadata(null)}),
      )
      const reload = controller.reloadDialogues()
      await vi.waitFor(() => expect(getDialogue).toHaveBeenCalledOnce())

      controller.setDialogues([createListItem(LISTENED_AT)])
      dialogueLoad.resolve(DIALOGUE)
      await reload

      expect(controller.dialogues()[0]?.metadata.listenedAt).toBe(LISTENED_AT)
    } finally {
      dispose()
    }
  })
})

it('should apply a listened mark received from a fresh reload', async () => {
  const getDialogue = vi.fn(async () => DIALOGUE)

  await createRoot(async (dispose) => {
    try {
      const controller = createController(
        createRepositories({getDialogue, metadata: createMetadata(LISTENED_AT)}),
      )
      controller.setDialogues([createListItem(null)])
      await controller.reloadDialogues()

      expect(controller.dialogues()[0]?.metadata.listenedAt).toBe(LISTENED_AT)
    } finally {
      dispose()
    }
  })
})
