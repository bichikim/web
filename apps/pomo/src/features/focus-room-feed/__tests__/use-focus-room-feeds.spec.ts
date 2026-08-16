import {expect, it} from 'vitest'

import {
  type FeedDialogueListItem,
  findFeedNotificationDialogue,
  findRemovableExpiredDialogues,
} from '..'

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
