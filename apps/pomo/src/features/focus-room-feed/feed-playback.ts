import {type Accessor, createSignal, type Setter} from 'solid-js'

import type {PEventContextValue} from '../focus-room-dialogue'
import type {FeedDialogueListItem} from './feed-controller'
import type {FeedDialogueRepository} from './feed-dialogue-repository'
import {recoverMissingFeedDialogue} from './missing-dialogue-recovery'

interface FeedPlaybackEvents extends Pick<
  PEventContextValue,
  'deleteDialogue' | 'playDialogueSequence'
> {}

export interface CreateFeedPlaybackControllerOptions {
  readonly createId: () => string
  readonly dialogues: Accessor<ReadonlyArray<FeedDialogueListItem>>
  readonly events: FeedPlaybackEvents
  readonly isDisposed: () => boolean
  readonly now: () => Date
  readonly repository: () => FeedDialogueRepository
  readonly scheduleJobs: (jobIds: ReadonlyArray<string>) => void
  readonly setDialogues: Setter<ReadonlyArray<FeedDialogueListItem>>
}

export interface FeedPlaybackController {
  readonly isListening: Accessor<boolean>
  readonly listen: (dialogueId: string) => Promise<void>
  readonly listenAll: () => Promise<void>
}

/** Owns feed listening state and repairs generated dialogues whose audio is unavailable. */
export const createFeedPlaybackController = (
  options: CreateFeedPlaybackControllerOptions,
): FeedPlaybackController => {
  const [isListening, setIsListening] = createSignal(false)
  const markDialoguesListened = async (dialogueIds: ReadonlyArray<string>) => {
    const pendingIds = new Set(dialogueIds)
    const pendingItems = options
      .dialogues()
      .filter(
        (item) => pendingIds.has(item.metadata.dialogueId) && item.metadata.listenedAt === null,
      )

    if (pendingItems.length === 0) {
      return
    }

    const listenedAt = options.now().toISOString()
    const repository = options.repository()
    const storedIds = new Set(pendingItems.map((item) => item.metadata.dialogueId))
    await Promise.all(
      pendingItems.map((item) => repository.markListened(item.metadata.dialogueId, listenedAt)),
    )
    options.setDialogues((items) =>
      items.map((item) =>
        storedIds.has(item.metadata.dialogueId)
          ? {...item, metadata: {...item.metadata, listenedAt}}
          : item,
      ),
    )
  }
  const recoverUnavailableDialogue = async (dialogueId: string) => {
    const missingDialogue = options.dialogues().find((item) => item.dialogue.id === dialogueId)

    if (missingDialogue === undefined) {
      return
    }

    const job = await recoverMissingFeedDialogue({
      createId: options.createId,
      listItem: missingDialogue,
      now: options.now(),
      repository: options.repository(),
    })

    if (options.isDisposed()) {
      return
    }

    options.setDialogues((items) => items.filter((entry) => entry.dialogue.id !== dialogueId))

    if (job !== null) {
      options.scheduleJobs([job.id])
    }

    await options.events.deleteDialogue(dialogueId)
  }
  const markListened = (dialogueId: string) => markDialoguesListened([dialogueId])

  return {
    isListening,
    async listen(dialogueId) {
      await options.events.playDialogueSequence({
        dialogueIds: [dialogueId],
        onDialogueStart: markListened,
        onDialogueUnavailable: recoverUnavailableDialogue,
        onSequenceStop: markDialoguesListened,
      })
    },
    async listenAll() {
      if (isListening()) {
        return
      }

      const dialogueIds = options
        .dialogues()
        .filter((item) => item.metadata.listenedAt === null)
        .map((item) => item.dialogue.id)
        .toReversed()

      if (dialogueIds.length === 0) {
        return
      }

      setIsListening(true)

      try {
        await options.events.playDialogueSequence({
          dialogueIds,
          onDialogueStart: markListened,
          onDialogueUnavailable: recoverUnavailableDialogue,
          // A user stop dismisses the whole feed batch; cancellations and playback failures do not.
          onSequenceStop: markDialoguesListened,
        })
      } finally {
        if (!options.isDisposed()) {
          setIsListening(false)
        }
      }
    },
  }
}
