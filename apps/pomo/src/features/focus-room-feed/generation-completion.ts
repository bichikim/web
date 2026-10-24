import type {GenerateCompressedDialogueAudioResult} from '../focus-room-dialogue/generate-dialogue-audio'
import type {PDialogue} from '../focus-room-dialogue/schema'
import {
  FEED_DIALOGUE_EXPIRATION_MS,
  type FeedDialogueJob,
  type FeedDialogueMetadata,
  type FeedItemRecord,
} from './feed-dialogue-schema'

export interface CreateFeedDialogueCompletionOptions {
  readonly createId: () => string
  readonly generated: Extract<GenerateCompressedDialogueAudioResult, {readonly ok: true}>
  readonly job: FeedDialogueJob
  readonly now: Date
  readonly storedItem: FeedItemRecord
}

export interface FeedDialogueCompletion {
  readonly audio: Blob
  readonly dialogue: PDialogue
  readonly metadata: FeedDialogueMetadata
  readonly readyItem: FeedItemRecord
}

export const createFeedDialogueCompletion = (
  options: CreateFeedDialogueCompletionOptions,
): FeedDialogueCompletion => {
  const nowIso = options.now.toISOString()
  const dialogueId = options.createId()
  const dialogue = {
    audioKey: options.createId(),
    createdAt: nowIso,
    durationMs: options.generated.value.durationMs,
    id: dialogueId,
    language: 'ko',
    modelId: options.job.modelId,
    segments: options.generated.value.segments,
    text: options.job.script,
    updatedAt: nowIso,
    version: 1,
    voiceId: options.job.voiceId,
  } satisfies PDialogue
  const metadata = {
    createdAt: nowIso,
    dialogueId,
    expiresAt: new Date(options.now.getTime() + FEED_DIALOGUE_EXPIRATION_MS).toISOString(),
    feedConnectionId: options.job.feedConnectionId,
    feedItemId: options.job.feedItemId,
    itemTitle: options.job.itemTitle,
    listenedAt: null,
    publishedAt: options.job.publishedAt,
    sourceTitle: options.job.sourceTitle,
    sourceUrl: options.job.sourceUrl,
    version: 1,
  } satisfies FeedDialogueMetadata
  const readyItem = {
    ...options.storedItem,
    message: null,
    status: 'ready',
    updatedAt: nowIso,
  } satisfies FeedItemRecord

  return {audio: options.generated.value.audio, dialogue, metadata, readyItem}
}
