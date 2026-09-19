/** @vitest-environment node */

import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {FeedDialogueListItem} from '../features/focus-room-feed/feed-controller'
import {createFeedPlaybackController} from '../features/focus-room-feed/feed-playback'

const createDialogue = (dialogueId: string): FeedDialogueListItem => ({
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
    listenedAt: null,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: `https://example.com/${dialogueId}`,
    version: 1,
  },
})

it('should not mark a feed dialogue listened when playback fails after onDialogueStart', async () => {
  const dialogue = createDialogue('blocked')
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([dialogue])
  const markListened = vi.fn().mockResolvedValue(undefined)
  const repository = {
    markListened,
    recoverMissingDialogue: vi.fn(),
  }

  const playback = createFeedPlaybackController({
    createId: () => 'job-1',
    dialogues,
    events: {
      deleteDialogue: vi.fn(),
      playDialogueSequence: vi.fn(async (options) => {
        await options.onDialogueStart?.('blocked')
      }),
    },
    isDisposed: () => false,
    now: () => new Date('2026-08-14T00:00:00.000Z'),
    repository: () => repository,
    scheduleJobs: vi.fn(),
    setDialogues,
  })

  await playback.listen('blocked')

  expect(markListened).not.toHaveBeenCalled()
  expect(dialogues()[0]?.metadata.listenedAt).toBeNull()
})
