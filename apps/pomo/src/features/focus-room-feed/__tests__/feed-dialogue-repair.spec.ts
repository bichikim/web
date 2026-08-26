import {expect, it, vi} from 'vitest'

import type {PDialogue, PDialogueRepository} from '../../focus-room-dialogue'
import {
  isLegacyDevFeedFailure,
  isMalformedDevFeedDialogue,
  repairStoredDevFeedDialogues,
} from '../feed-dialogue-repair'
import type {FeedDialogueRepository} from '../feed-dialogue-repository'
import type {FeedDialogueMetadata, FeedItemRecord} from '../feed-dialogue-schema'
import type {FeedConnection} from '../schema'

const dialogue = (id: string, text: string) => ({id, text}) as PDialogue
const metadata = (dialogueId: string, sourceUrl: string) =>
  ({
    dialogueId,
    feedConnectionId: 'feed',
    feedItemId: `item-${dialogueId}`,
    sourceUrl,
  }) as FeedDialogueMetadata

const failure = (overrides: Partial<FeedItemRecord> = {}) =>
  ({
    feedConnectionId: 'feed',
    feedItemId: 'item',
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    sourceUrl: 'https://example.test/__dev/feeds/rss.xml',
    status: 'failed',
    ...overrides,
  }) as FeedItemRecord

it('should detect only leaked identifiers in development feed dialogues', () => {
  expect(
    isMalformedDevFeedDialogue({
      dialogue: dialogue('rss', 'pomo-dev-feed: leaked'),
      metadata: metadata('rss', 'https://example.test/__dev/feeds/rss.xml'),
    }),
  ).toBe(true)
  expect(
    isMalformedDevFeedDialogue({
      dialogue: dialogue('atom', 'urn:pomo:dev-feed: leaked'),
      metadata: metadata('atom', 'https://example.test/__dev/feeds/atom.xml'),
    }),
  ).toBe(true)
  expect(
    isMalformedDevFeedDialogue({
      dialogue: dialogue('normal', 'pomo-dev-feed: text'),
      metadata: metadata('normal', 'https://example.test/article'),
    }),
  ).toBe(false)
  expect(
    isMalformedDevFeedDialogue({
      dialogue: dialogue('clean', 'clean text'),
      metadata: metadata('clean', 'https://example.test/__dev/feeds/rss.xml'),
    }),
  ).toBe(false)
})

it('should detect only the exact legacy development failure', () => {
  expect(isLegacyDevFeedFailure(failure())).toBe(true)
  expect(isLegacyDevFeedFailure(failure({sourceUrl: 'https://example.test/article'}))).toBe(false)
  expect(isLegacyDevFeedFailure(failure({status: 'queued'}))).toBe(false)
  expect(isLegacyDevFeedFailure(failure({message: 'different'}))).toBe(false)
})

it('should remove malformed dialogues, metadata, and legacy failed items', async () => {
  const malformedMetadata = metadata('malformed', 'https://example.test/__dev/feeds/rss.xml')
  const cleanMetadata = metadata('clean', 'https://example.test/article')
  const deleteDialogue = vi.fn(async () => undefined)
  const removeMetadata = vi.fn(async () => undefined)
  const removeItem = vi.fn(async () => undefined)
  const feedRepository = {
    listItems: vi.fn(async () => [failure(), failure({feedItemId: 'current', message: 'current'})]),
    listMetadata: vi.fn(async () => [
      malformedMetadata,
      cleanMetadata,
      metadata('missing', 'https://example.test/article'),
    ]),
    removeItem,
    removeMetadata,
  } as unknown as FeedDialogueRepository
  const dialogueRepository = {
    deleteDialogue,
    getDialogue: vi.fn(async (id: string) => {
      if (id === 'malformed') {
        return dialogue(id, 'pomo-dev-feed: leaked')
      }

      if (id === 'clean') {
        return dialogue(id, 'clean')
      }

      return null
    }),
  } as unknown as PDialogueRepository

  const repaired = await repairStoredDevFeedDialogues({
    connections: [{id: 'feed'} as FeedConnection],
    dialogueRepository,
    feedRepository,
  })

  expect(repaired).toBe(1)
  expect(deleteDialogue).toHaveBeenCalledWith('malformed')
  expect(removeMetadata).toHaveBeenCalledWith('malformed')
  expect(removeItem).toHaveBeenCalledWith('feed', 'item-malformed')
  expect(removeItem).toHaveBeenCalledWith('feed', 'item')
})
