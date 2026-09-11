import {Show} from 'solid-js'
import {vi} from 'vitest'
import {PModal, type PModalProps} from 'src/components/PModal'
import type {
  FeedDialogueJob,
  FeedDialogueListItem,
  PFeedController,
} from 'src/features/focus-room-feed'
import type {ModelDownloadController, ModelDownloadResult} from 'src/features/model-download'

export const READY_DIALOGUE: FeedDialogueListItem = {
  dialogue: {
    audioKey: 'audio-1',
    createdAt: '2026-08-14T00:00:00.000Z',
    durationMs: 1000,
    id: 'dialogue-1',
    language: 'ko',
    modelId: 'full',
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 피드'}],
    text: '새 피드',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  },
  metadata: {
    createdAt: '2026-08-14T00:00:00.000Z',
    dialogueId: 'dialogue-1',
    expiresAt: '2026-08-16T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'item-1',
    itemTitle: '새로운 소식',
    listenedAt: null,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: 'https://example.com/article',
    version: 1,
  },
}

export const RECOVERY_JOB: FeedDialogueJob = {
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: '음성 모델 다운로드에 동의한 뒤 다시 시도해 주세요.',
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: 'job-1',
  itemTitle: '새로운 소식',
  modelId: 'full',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '피드 음성 대사',
  sourceTitle: '테스트 피드',
  sourceUrl: 'https://example.com/article',
  status: 'failed',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

export const createFeeds = (
  dialogues: ReadonlyArray<FeedDialogueListItem> = [READY_DIALOGUE],
  isListening = false,
  recoveryJobs: ReadonlyArray<FeedDialogueJob> = [],
  overrides: Partial<PFeedController> = {},
): PFeedController => ({
  cancelProcessing: vi.fn(async () => undefined),
  deleteRecovery: vi.fn(async () => undefined),
  dialogues: () => dialogues,
  dismissRecovery: vi.fn(),
  isListening: () => isListening,
  issues: () => [],
  latestReady: () => dialogues[0] ?? null,
  listen: vi.fn(async () => undefined),
  listenAll: vi.fn(async () => undefined),
  onDeleteDialogue: vi.fn(async () => undefined),
  recoveryJobs: () => recoveryJobs,
  retryRecovery: vi.fn(async () => undefined),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => dialogues,
  ...overrides,
})

export const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  downloads: () => [],
  startImageModel: vi.fn(),
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  startVoiceModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  state: () => ({status: 'idle'}),
})

export const renderModal = () => {
  vi.mocked(PModal).mockImplementation((props: PModalProps) => {
    return (
      <Show when={props.isOpen}>
        <div aria-label={props.title} role="dialog">
          {props.children}
        </div>
      </Show>
    )
  })
}
