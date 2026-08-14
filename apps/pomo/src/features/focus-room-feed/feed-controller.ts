import type {Accessor} from 'solid-js'

import type {FocusRoomDialogue, FocusRoomEventContextValue} from '../focus-room-dialogue'
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

export type FocusRoomFeedState = FeedActivityState | FeedErrorState | FeedIdleState

export interface FeedDialogueListItem {
  readonly dialogue: FocusRoomDialogue
  readonly metadata: FeedDialogueMetadata
}

export interface FocusRoomFeedController {
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
  readonly state: Accessor<FocusRoomFeedState>
  readonly syncNow: () => Promise<void>
  readonly unlistenedDialogues: Accessor<ReadonlyArray<FeedDialogueListItem>>
}

export interface UseFocusRoomFeedsProps {
  readonly events: FocusRoomEventContextValue
}

export const findFeedNotificationDialogue = (items: ReadonlyArray<FeedDialogueListItem>) =>
  items.find((item) => item.metadata.listenedAt === null) ?? null
