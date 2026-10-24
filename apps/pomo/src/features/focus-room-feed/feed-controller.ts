import type {FeedSettingsRuntime} from './settings-runtime'
import type {useAutoPreparePreference} from './use-auto-prepare-preference'
import type {Accessor} from 'solid-js'

import type {PDialogue, PEventContextValue} from '../focus-room-dialogue'
import type {FeedDialogueJob, FeedDialogueMetadata, FeedItemRecord} from './feed-dialogue-schema'

interface FeedIdleState {
  readonly message: string
  readonly status: 'idle'
}

interface FeedActivityState {
  readonly message: string
  readonly progress: number | null
  readonly status: 'generating' | 'preparing' | 'syncing'
}

interface FeedErrorState {
  readonly message: string
  readonly status: 'error'
}

export type PFeedState = FeedActivityState | FeedErrorState | FeedIdleState

export const NO_FEED_CONNECTIONS_STATE = {
  message: '설정에서 구독 피드를 추가해 주세요.',
  status: 'idle',
} as const satisfies PFeedState

export const isNoFeedConnectionGuidance = (state: PFeedState): boolean =>
  state.status === 'idle' && state.message === NO_FEED_CONNECTIONS_STATE.message

export interface FeedDialogueListItem {
  readonly dialogue: PDialogue
  readonly metadata: FeedDialogueMetadata
}

export interface PFeedController {
  readonly automaticPreparation?: ReturnType<typeof useAutoPreparePreference>
  readonly cancelProcessing: () => Promise<void>
  readonly dialogues: Accessor<ReadonlyArray<FeedDialogueListItem>>
  readonly dismissRecovery: () => void
  readonly deleteRecovery: () => Promise<void>
  readonly isListening: Accessor<boolean>
  readonly latestReady: Accessor<FeedDialogueListItem | null>
  readonly listen: (dialogueId: string) => Promise<void>
  readonly listenAll: () => Promise<void>
  readonly onDeleteDialogue: (dialogueId: string) => Promise<void>
  readonly issues: Accessor<ReadonlyArray<FeedItemRecord>>
  readonly recoveryJobs: Accessor<ReadonlyArray<FeedDialogueJob>>
  readonly retryRecovery: () => Promise<void>
  readonly state: Accessor<PFeedState>
  readonly syncNow: () => Promise<void>
  readonly unlistenedDialogues: Accessor<ReadonlyArray<FeedDialogueListItem>>
}

export interface UsePFeedsProps {
  readonly settingsRuntime?: FeedSettingsRuntime
  readonly events: PEventContextValue
}

export const findFeedNotificationDialogue = (items: ReadonlyArray<FeedDialogueListItem>) =>
  items.find((item) => item.metadata.listenedAt === null) ?? null
