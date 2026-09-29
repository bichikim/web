/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import type {PDialogue, PDialogueRepository} from '../features/focus-room-dialogue'
import {repairStoredDevFeedDialogues} from '../features/focus-room-feed/feed-dialogue-repair'
import type {FeedDialogueRepository} from '../features/focus-room-feed/feed-dialogue-repository'
import type {FeedDialogueMetadata, FeedItemRecord} from '../features/focus-room-feed/feed-dialogue-schema'
import type {FeedConnection} from '../features/focus-room-feed/schema'

const dialogue = (id: string, text: string) => ({id, text}) as PDialogue
const metadata = (dialogueId: string, sourceUrl: string) =>
  ({
    dialogueId,
    feedConnectionId: 'feed',
    feedItemId: `item-${dialogueId}`,
    sourceUrl,
  }) as FeedDialogueMetadata

const legacyFailure = (sourceUrl: string) =>
  ({
    feedConnectionId: 'feed',
    feedItemId: 'legacy-item',
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    sourceUrl,
    status: 'failed',
  }) as FeedItemRecord

it('should repair malformed dev feed dialogues when sourceUrl has a trailing slash on the path', async () => {
  const sourceUrl = 'https://example.test/__dev/feeds/rss.xml/'
  const malformedMetadata = metadata('malformed', sourceUrl)
  const deleteDialogue = vi.fn(async () => undefined)
  const removeMetadata = vi.fn(async () => undefined)
  const removeItem = vi.fn(async () => undefined)
  const feedRepository = {
    listItems: vi.fn(async () => [legacyFailure(sourceUrl)]),
    listMetadata: vi.fn(async () => [malformedMetadata]),
    removeItem,
    removeMetadata,
  } as unknown as FeedDialogueRepository
  const dialogueRepository = {
    deleteDialogue,
    getDialogue: vi.fn(async () => dialogue('malformed', 'pomo-dev-feed: leaked')),
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
  expect(removeItem).toHaveBeenCalledWith('feed', 'legacy-item')
})
