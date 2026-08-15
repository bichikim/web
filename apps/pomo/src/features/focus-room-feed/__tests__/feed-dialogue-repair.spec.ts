import {expect, it} from 'vitest'

import type {PDialogue} from '../../focus-room-dialogue'
import {isLegacyDevFeedFailure, isMalformedDevFeedDialogue} from '../feed-dialogue-repair'
import type {FeedDialogueMetadata, FeedItemRecord} from '../feed-dialogue-schema'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}
const METADATA: FeedDialogueMetadata = {
  createdAt: '2026-08-14T00:00:00.000Z',
  dialogueId: DIALOGUE.id,
  expiresAt: '2026-08-16T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: 'pomo-dev-feed:2026-08-14T00:00:00.000Z',
  itemTitle: '안녕하세요',
  listenedAt: null,
  publishedAt: '2026-08-14T00:00:00.000Z',
  sourceTitle: 'Pomo 개발 테스트 피드',
  sourceUrl: 'http://localhost:3200/__dev/feeds/rss.xml#item',
  version: 1,
}

it('should detect RSS XML identifiers leaked into a dev feed dialogue', () => {
  expect(
    isMalformedDevFeedDialogue({
      dialogue: {...DIALOGUE, text: '//localhost/feed.xml pomo-dev-feed:2026-08-14'},
      metadata: METADATA,
    }),
  ).toBe(true)
})

it('should keep a valid dev message and unrelated feed dialogue', () => {
  expect(isMalformedDevFeedDialogue({dialogue: DIALOGUE, metadata: METADATA})).toBe(false)
  expect(
    isMalformedDevFeedDialogue({
      dialogue: {...DIALOGUE, text: 'pomo-dev-feed:는 문서에서 사용하는 예시예요.'},
      metadata: {...METADATA, sourceUrl: 'https://example.com/article'},
    }),
  ).toBe(false)
})

it('should detect the temporary dev self-link failure only', () => {
  const item: FeedItemRecord = {
    contentLength: 0,
    discoveredAt: '2026-08-14T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'item-1',
    id: 'feed-1\u0000item-1',
    itemTitle: '안녕하세요',
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: 'Pomo 개발 테스트 피드',
    sourceUrl: 'http://localhost:3200/__dev/feeds/rss.xml#item-1',
    status: 'failed',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
  }

  expect(isLegacyDevFeedFailure(item)).toBe(true)
  expect(isLegacyDevFeedFailure({...item, sourceUrl: 'https://example.com/feed.xml'})).toBe(false)
})
