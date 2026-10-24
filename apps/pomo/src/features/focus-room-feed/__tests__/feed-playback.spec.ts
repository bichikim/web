/** @vitest-environment node */
import {createRoot, createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import type {PDialogue} from '../../focus-room-dialogue/schema'
import {createFeedPlaybackController} from '../feed-playback'
import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {FeedDialogueMetadata} from '../feed-dialogue-schema'
import type {FeedDialogueListItem} from '../feed-controller'

const LISTENED_AT = '2026-08-14T01:00:00.000Z'
const DIALOGUE_CREATED_AT = '2026-08-14T00:00:00.000Z'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: DIALOGUE_CREATED_AT,
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'int8',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: DIALOGUE_CREATED_AT,
  version: 1,
  voiceId: 'Yuna',
}

const createMetadata = (dialogueId: string, listenedAt: string | null): FeedDialogueMetadata => ({
  createdAt: DIALOGUE_CREATED_AT,
  dialogueId,
  expiresAt: '2026-08-16T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: `item-${dialogueId}`,
  itemTitle: `피드 ${dialogueId}`,
  listenedAt,
  publishedAt: DIALOGUE_CREATED_AT,
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${dialogueId}`,
  version: 1,
})

const createListItem = (dialogueId: string, listenedAt: string | null): FeedDialogueListItem => ({
  dialogue: {...DIALOGUE, id: dialogueId},
  metadata: createMetadata(dialogueId, listenedAt),
})

const createRepository = () =>
  ({
    complete: vi.fn(),
    deleteJobs: vi.fn(),
    dismissItem: vi.fn(),
    dispose: vi.fn(),
    failJob: vi.fn(),
    interruptUnfinishedJobs: vi.fn(),
    listExpiredMetadata: vi.fn(),
    listItems: vi.fn(),
    listJobs: vi.fn(),
    listMetadata: vi.fn(),
    markListened: vi.fn(async () => undefined),
    queue: vi.fn(),
    recoverMissingDialogue: vi.fn(),
    removeItem: vi.fn(),
    removeMetadata: vi.fn(),
    retryJobs: vi.fn(),
    saveItems: vi.fn(),
    startJob: vi.fn(),
  }) satisfies FeedDialogueRepository

const createPlayback = (items: ReadonlyArray<FeedDialogueListItem>) => {
  const repository = createRepository()
  const events = {
    deleteDialogue: vi.fn(async () => undefined),
    playDialogueSequence: vi.fn<PEventContextValue['playDialogueSequence']>(),
  } satisfies Pick<PEventContextValue, 'deleteDialogue' | 'playDialogueSequence'>

  return createRoot((dispose) => {
    const [currentDialogues, setDialogues] = createSignal(items)
    const playback = createFeedPlaybackController({
      createId: () => 'job-1',
      dialogues: currentDialogues,
      events,
      isDisposed: () => false,
      now: () => new Date(LISTENED_AT),
      repository: () => repository,
      scheduleJobs: vi.fn(),
      setDialogues,
    })

    return {dialogues: currentDialogues, dispose, events, playback, repository}
  })
}

it('should not mark an individual dialogue when stopped before playback starts', async () => {
  const view = createPlayback([createListItem(DIALOGUE.id, null)])
  vi.mocked(view.events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onSequenceStop(options.dialogueIds)
  })

  await view.playback.listen(DIALOGUE.id)

  expect(view.repository.markListened).not.toHaveBeenCalled()
  expect(view.dialogues()[0]?.metadata.listenedAt).toBeNull()
  view.dispose()
})

it('should mark an individual dialogue when playback starts', async () => {
  const view = createPlayback([createListItem(DIALOGUE.id, null)])
  vi.mocked(view.events.playDialogueSequence).mockImplementation(async (options) => {
    const dialogueId = options.dialogueIds[0]
    if (dialogueId === undefined) {
      throw new Error('Expected an individual dialogue.')
    }

    await options.onDialogueStart(dialogueId)
  })

  await view.playback.listen(DIALOGUE.id)

  expect(view.repository.markListened).toHaveBeenCalledOnce()
  expect(view.repository.markListened).toHaveBeenCalledWith(DIALOGUE.id, LISTENED_AT)
  expect(view.dialogues()[0]?.metadata.listenedAt).toBe(LISTENED_AT)
  view.dispose()
})

it('should ignore an individual dialogue while another individual playback is active', async () => {
  const view = createPlayback([createListItem('first', null), createListItem('second', null)])
  const playback = Promise.withResolvers<void>()
  vi.mocked(view.events.playDialogueSequence).mockReturnValue(playback.promise)

  const first = view.playback.listen('first')
  const second = view.playback.listen('second')

  expect(view.playback.isListening()).toBe(true)
  expect(view.events.playDialogueSequence).toHaveBeenCalledOnce()

  playback.resolve()
  await Promise.all([first, second])

  expect(view.events.playDialogueSequence).toHaveBeenCalledOnce()
  expect(view.playback.isListening()).toBe(false)
  view.dispose()
})

it('should mark every dialogue in a stopped batch', async () => {
  const view = createPlayback([createListItem('first', null), createListItem('second', null)])
  vi.mocked(view.events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onSequenceStop(options.dialogueIds)
  })

  await view.playback.listenAll()

  expect(view.repository.markListened).toHaveBeenCalledTimes(2)
  expect(view.repository.markListened).toHaveBeenCalledWith('first', LISTENED_AT)
  expect(view.repository.markListened).toHaveBeenCalledWith('second', LISTENED_AT)
  expect(view.dialogues().every((item) => item.metadata.listenedAt === LISTENED_AT)).toBe(true)
  view.dispose()
})
