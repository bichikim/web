import type {FeedDialogueListItem} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import {
  type FeedDialogueJob,
  type FeedItemRecord,
  getFeedItemRecordId,
} from './feed-dialogue-schema'

export interface RecoverMissingFeedDialogueOptions {
  readonly createId: () => string
  readonly listItem: FeedDialogueListItem
  readonly now: Date
  readonly repository: FeedDialogueRepository
}

/** Replaces an unavailable feed dialogue with a generation job for the same item. */
export const recoverMissingFeedDialogue = async (
  options: RecoverMissingFeedDialogueOptions,
): Promise<FeedDialogueJob | null> => {
  const {metadata} = options.listItem
  const updatedAt = options.now.toISOString()
  const storedItems = await options.repository.listItems(metadata.feedConnectionId)
  const storedItem = storedItems.find((item) => item.feedItemId === metadata.feedItemId)
  const item = {
    contentLength: storedItem?.contentLength ?? options.listItem.dialogue.text.length,
    discoveredAt: storedItem?.discoveredAt ?? metadata.createdAt,
    feedConnectionId: metadata.feedConnectionId,
    feedItemId: metadata.feedItemId,
    id: getFeedItemRecordId(metadata.feedConnectionId, metadata.feedItemId),
    itemTitle: metadata.itemTitle,
    message: null,
    publishedAt: metadata.publishedAt,
    sourceTitle: metadata.sourceTitle,
    sourceUrl: metadata.sourceUrl,
    status: 'queued',
    updatedAt,
    version: 1,
  } satisfies FeedItemRecord
  const job = {
    createdAt: updatedAt,
    errorMessage: null,
    feedConnectionId: metadata.feedConnectionId,
    feedItemId: metadata.feedItemId,
    id: options.createId(),
    itemTitle: metadata.itemTitle,
    modelId: options.listItem.dialogue.modelId,
    publishedAt: metadata.publishedAt,
    script: options.listItem.dialogue.text,
    sourceTitle: metadata.sourceTitle,
    sourceUrl: metadata.sourceUrl,
    status: 'queued',
    updatedAt,
    version: 1,
    voiceId: options.listItem.dialogue.voiceId,
  } satisfies FeedDialogueJob

  const recovered = await options.repository.recoverMissingDialogue({
    dialogueId: options.listItem.dialogue.id,
    item,
    job,
  })
  return recovered ? job : null
}
