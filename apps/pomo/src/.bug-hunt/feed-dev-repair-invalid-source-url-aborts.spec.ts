/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import type {PDialogue, PDialogueRepository} from '../features/focus-room-dialogue'
import {repairStoredDevFeedDialogues} from '../features/focus-room-feed/feed-dialogue-repair'
import type {FeedDialogueRepository} from '../features/focus-room-feed/feed-dialogue-repository'
import type {
  FeedDialogueMetadata,
  FeedItemRecord,
} from '../features/focus-room-feed/feed-dialogue-schema'
import type {FeedConnection} from '../features/focus-room-feed/schema'

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
    feedItemId: 'legacy-failed',
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    sourceUrl: 'https://example.test/__dev/feeds/rss.xml',
    status: 'failed',
    ...overrides,
  }) as FeedItemRecord

it('should repair malformed dev dialogues even when another row has an invalid sourceUrl', async () => {
  const malformedMetadata = metadata('malformed', 'https://example.test/__dev/feeds/rss.xml')
  const invalidMetadata = metadata('invalid-url', 'not-a-url')
  const deleteDialogue = vi.fn(async () => undefined)
  const removeMetadata = vi.fn(async () => undefined)
  const removeItem = vi.fn(async () => undefined)
  const feedRepository = {
    listItems: vi.fn(async () => [failure()]),
    listMetadata: vi.fn(async () => [invalidMetadata, malformedMetadata]),
    removeItem,
    removeMetadata,
  } as unknown as FeedDialogueRepository
  const dialogueRepository = {
    deleteDialogue,
    getDialogue: vi.fn(async (id: string) => {
      if (id === 'malformed') {
        return dialogue(id, 'pomo-dev-feed: leaked')
      }

      if (id === 'invalid-url') {
        return dialogue(id, 'ignored')
      }

      return null
    }),
  } as unknown as PDialogueRepository

  await expect(
    repairStoredDevFeedDialogues({
      connections: [{id: 'feed'} as FeedConnection],
      dialogueRepository,
      feedRepository,
    }),
  ).resolves.toBe(1)

  expect(deleteDialogue).toHaveBeenCalledWith('malformed')
  expect(removeMetadata).toHaveBeenCalledWith('malformed')
  expect(removeItem).toHaveBeenCalledWith('feed', 'item-malformed')
  expect(removeItem).toHaveBeenCalledWith('feed', 'legacy-failed')
})
