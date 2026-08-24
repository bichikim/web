import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type FeedDialogueListItem,
  findFeedNotificationDialogue,
  findRemovableExpiredDialogues,
} from '..'
import type {PEventContextValue} from '../../focus-room-dialogue'
import {feedGenerationRuntime} from '../generation-runtime'
import {FEED_CONNECTIONS_CHANGED_EVENT} from '../use-feed-connections'
import {usePFeeds} from '../use-focus-room-feeds'

const repositoryMocks = vi.hoisted(() => {
  const dialogueRepository = {
    deleteDialogue: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    getDialogue: vi.fn().mockResolvedValue(null),
  }
  const feedRepository = {
    deleteJobs: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    interruptUnfinishedJobs: vi.fn().mockResolvedValue([]),
    listExpiredMetadata: vi.fn().mockResolvedValue([]),
    listItems: vi.fn().mockResolvedValue([]),
    listJobs: vi.fn().mockResolvedValue([]),
    listMetadata: vi.fn().mockResolvedValue([]),
    removeMetadata: vi.fn().mockResolvedValue(undefined),
  }

  return {dialogueRepository, feedRepository, listConnections: vi.fn(() => [])}
})

vi.mock('../../focus-room-dialogue/repository', () => ({
  createPDialogueRepository: () => repositoryMocks.dialogueRepository,
}))
vi.mock('../feed-dialogue-repository', () => ({
  createFeedDialogueRepository: () => repositoryMocks.feedRepository,
}))
vi.mock('../feed-dialogue-repair', () => ({
  repairStoredDevFeedDialogues: vi.fn().mockResolvedValue(0),
}))
vi.mock('../repository', () => ({
  createFeedConnectionRepository: () => ({list: repositoryMocks.listConnections}),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

const createEventContext = (
  refreshDialogues = vi.fn(async () => undefined),
): PEventContextValue => ({
  activeDialogueId: vi.fn(() => null),
  activeSegmentCount: vi.fn(() => 0),
  activeSegmentMood: vi.fn(() => null),
  activeSegmentPosition: vi.fn(() => null),
  activeText: vi.fn(() => null),
  activeViseme: vi.fn(() => 'rest' as const),
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: vi.fn(() => []),
  enterFocusRoom: vi.fn(),
  entryDialogueId: vi.fn(() => null),
  entryDialogueIds: vi.fn(() => []),
  errorMessage: vi.fn(() => null),
  eventDialogueIds: vi.fn(() => ({})),
  eventPlaybackModes: vi.fn(() => ({})),
  getAudio: vi.fn(async () => null),
  hasEnteredFocusRoom: vi.fn(() => false),
  isDialoguePlaybackBlocked: vi.fn(() => false),
  isDialoguePlaying: vi.fn(() => false),
  isDialogueScheduled: vi.fn(() => false),
  isEntryPlaybackBlocked: vi.fn(() => false),
  isLoading: vi.fn(() => false),
  onStopDialoguePlayback: vi.fn(),
  onStopEntryPlayback: vi.fn(),
  playDialogue: vi.fn(async () => undefined),
  playDialogueEvents: vi.fn(async () => undefined),
  playDialogueSequence: vi.fn(async () => undefined),
  refreshDialogues,
  retryDialoguePlayback: vi.fn(),
  retryEntryPlayback: vi.fn(),
  scheduledDialogueCount: vi.fn(() => 0),
  setEntryDialogue: vi.fn(async () => undefined),
  setEntryDialogues: vi.fn(async () => undefined),
  setEventDialogue: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  setEventPlaybackMode: vi.fn(async () => undefined),
  skipDialoguePlayback: vi.fn(),
})

const createDialogue = (dialogueId: string, listenedAt: string | null): FeedDialogueListItem => ({
  dialogue: {
    audioKey: `audio-${dialogueId}`,
    createdAt: '2026-08-14T00:00:00.000Z',
    durationMs: 1000,
    id: dialogueId,
    language: 'ko',
    modelId: 'full',
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
    text: '안녕하세요',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  },
  metadata: {
    createdAt: '2026-08-14T00:00:00.000Z',
    dialogueId,
    expiresAt: '2026-08-16T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: `item-${dialogueId}`,
    itemTitle: `피드 ${dialogueId}`,
    listenedAt,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: `https://example.com/${dialogueId}`,
    version: 1,
  },
})

it('should notify only for the first unlistened feed dialogue', () => {
  const listened = createDialogue('newest', '2026-08-14T01:00:00.000Z')
  const unlistened = createDialogue('older', null)

  expect(findFeedNotificationDialogue([listened, unlistened])).toBe(unlistened)
})

it('should not notify when every feed dialogue was listened to', () => {
  const first = createDialogue('first', '2026-08-14T01:00:00.000Z')
  const second = createDialogue('second', '2026-08-14T01:05:00.000Z')

  expect(findFeedNotificationDialogue([first, second])).toBeNull()
})

it('should preserve expired dialogues that are active or queued for playback', () => {
  const active = createDialogue('active', null).metadata
  const queued = createDialogue('queued', null).metadata
  const idle = createDialogue('idle', null).metadata

  expect(
    findRemovableExpiredDialogues({
      expired: [active, queued, idle],
      isDialogueScheduled: (dialogueId) => dialogueId === 'active' || dialogueId === 'queued',
    }),
  ).toEqual([idle])
})

it('should refresh from lifecycle events and remove every listener on cleanup', async () => {
  const documentAdd = vi.spyOn(document, 'addEventListener')
  const documentRemove = vi.spyOn(document, 'removeEventListener')
  const windowAdd = vi.spyOn(window, 'addEventListener')
  const windowRemove = vi.spyOn(window, 'removeEventListener')
  const refreshDialogues = vi.fn(async () => undefined)
  const events = createEventContext(refreshDialogues)
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() =>
    expect(view.result.state()).toMatchObject({message: '설정에서 구독 피드를 추가해 주세요.'}),
  )

  const listCount = repositoryMocks.listConnections.mock.calls.length
  window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))

  await vi.waitFor(() =>
    expect(repositoryMocks.listConnections.mock.calls.length).toBeGreaterThan(listCount),
  )
  expect(documentAdd).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
  expect(windowAdd).toHaveBeenCalledWith(FEED_CONNECTIONS_CHANGED_EVENT, expect.any(Function), {})
  expect(windowAdd).toHaveBeenCalledWith(
    feedGenerationRuntime.settingsChangedEvent,
    expect.any(Function),
    {},
  )

  view.cleanup()

  expect(documentRemove).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
  expect(windowRemove).toHaveBeenCalledWith(
    FEED_CONNECTIONS_CHANGED_EVENT,
    expect.any(Function),
    {},
  )
  expect(windowRemove).toHaveBeenCalledWith(
    feedGenerationRuntime.settingsChangedEvent,
    expect.any(Function),
    {},
  )
})
