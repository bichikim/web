import {expect, it} from 'vitest'

import type {FocusRoomDialogue} from '../../focus-room-dialogue'
import {excludeFeedDialogues} from '../dialogue-library'
import type {FeedDialogueListItem} from '../feed-controller'

const createDialogue = (id: string, text: string): FocusRoomDialogue => ({
  audioKey: `audio-${id}`,
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id,
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text}],
  text,
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

it('should exclude feed dialogues from a saved dialogue collection', () => {
  const manualDialogue = createDialogue('manual-dialogue', '직접 만든 대화')
  const feedDialogue = createDialogue('feed-dialogue', '피드로 만든 대화')
  const feedItem: FeedDialogueListItem = {
    dialogue: feedDialogue,
    metadata: {
      createdAt: '2026-08-14T00:00:00.000Z',
      dialogueId: feedDialogue.id,
      expiresAt: '2026-08-16T00:00:00.000Z',
      feedConnectionId: 'feed-1',
      feedItemId: 'item-1',
      itemTitle: '새 피드',
      listenedAt: null,
      publishedAt: '2026-08-14T00:00:00.000Z',
      sourceTitle: '테스트 피드',
      sourceUrl: 'https://example.com/article',
      version: 1,
    },
  }

  expect(excludeFeedDialogues([manualDialogue, feedDialogue], [feedItem])).toEqual([manualDialogue])
})
