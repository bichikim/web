import {expect, it, vi} from 'vitest'

import type {PDialogue} from '../../focus-room-dialogue'
import {
  deleteExpiredFeedDialogues,
  discardFeedJobs,
  loadFeedDialogueList,
  loadFeedIssues,
} from '../feed-dialogue-lifecycle'
import type {FeedDialogueJob, FeedDialogueMetadata, FeedItemRecord} from '../feed-dialogue-schema'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'int8',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const createMetadata = (dialogueId: string): FeedDialogueMetadata => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  dialogueId,
  expiresAt: '2026-08-16T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: `item-${dialogueId}`,
  itemTitle: '새 피드',
  listenedAt: null,
  publishedAt: '2026-08-14T00:00:00.000Z',
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${dialogueId}`,
  version: 1,
})

const createJob = (id: string, feedConnectionId: string): FeedDialogueJob => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: null,
  feedConnectionId,
  feedItemId: `item-${id}`,
  id,
  itemTitle: '새 피드',
  modelId: 'int8',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '안녕하세요',
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${id}`,
  status: 'queued',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

const createItem = (
  id: string,
  status: FeedItemRecord['status'],
  updatedAt: string,
): FeedItemRecord => ({
  contentLength: 10,
  discoveredAt: '2026-08-14T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: id,
  id: `feed-1\u0000${id}`,
  itemTitle: id,
  message: status === 'ready' ? null : '읽지 못했어요.',
  publishedAt: '2026-08-14T00:00:00.000Z',
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${id}`,
  status,
  updatedAt,
  version: 1,
})

it('should join metadata only with dialogue records that still exist', async () => {
  const availableMetadata = createMetadata(DIALOGUE.id)
  const missingMetadata = createMetadata('missing')
  const result = await loadFeedDialogueList({
    dialogueRepository: {
      getDialogue: vi.fn(async (dialogueId) => (dialogueId === DIALOGUE.id ? DIALOGUE : null)),
    },
    feedRepository: {listMetadata: vi.fn(async () => [availableMetadata, missingMetadata])},
  })

  expect(result).toEqual([{dialogue: DIALOGUE, metadata: availableMetadata}])
})

it('should delete expired dialogues except active or queued playback', async () => {
  const active = createMetadata('active')
  const idle = createMetadata('idle')
  const deleteDialogue = vi.fn(async () => undefined)
  const removeMetadata = vi.fn(async () => undefined)
  const deletedCount = await deleteExpiredFeedDialogues({
    dialogueRepository: {deleteDialogue},
    feedRepository: {
      listExpiredMetadata: vi.fn(async () => [active, idle]),
      removeMetadata,
    },
    isDialogueScheduled: (dialogueId) => dialogueId === active.dialogueId,
    now: new Date('2026-08-17T00:00:00.000Z'),
  })

  expect(deletedCount).toBe(1)
  expect(deleteDialogue).toHaveBeenCalledWith(idle.dialogueId)
  expect(removeMetadata).toHaveBeenCalledWith(idle.dialogueId)
})

it('should discard unfinished jobs from removed feed connections', async () => {
  const retainedJob = createJob('retained', 'feed-1')
  const discardedJob = createJob('discarded', 'feed-removed')
  const deleteJobs = vi.fn(async () => undefined)
  const jobIds = await discardFeedJobs({
    connectionIds: new Set(['feed-1']),
    feedRepository: {
      deleteJobs,
      listJobs: vi.fn(async () => [retainedJob, discardedJob]),
    },
    updatedAt: '2026-08-14T01:00:00.000Z',
  })

  expect(jobIds).toEqual([discardedJob.id])
  expect(deleteJobs).toHaveBeenCalledWith(jobIds, '2026-08-14T01:00:00.000Z')
})

it('should load only actionable feed issues in newest-first order', async () => {
  const result = await loadFeedIssues({
    connectionIds: ['feed-1'],
    feedRepository: {
      listItems: vi.fn(async () => [
        createItem('ready', 'ready', '2026-08-14T00:02:00.000Z'),
        createItem('failed', 'failed', '2026-08-14T00:01:00.000Z'),
        createItem('too-long', 'too-long', '2026-08-14T00:03:00.000Z'),
      ]),
    },
  })

  expect(result.map((item) => item.feedItemId)).toEqual(['too-long', 'failed'])
})
