import {type Accessor, createSignal} from 'solid-js'

import type {EntryPlaybackController} from '../entry-playback-controller'
import type {EventDialogueIds, EventPlaybackModes} from '../event-context'
import {selectEventDialogues} from '../event-playback'
import type {PDialogueRepository} from '../repository'
import {DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE, FOCUS_ROOM_ENTRY_EVENT} from '../schema'

const ENTRY_PLAYBACK_SESSION_KEY = 'pomo:focus-room-entry-playback:v1'

const readPlaybackSession = (): boolean => {
  try {
    return sessionStorage.getItem(ENTRY_PLAYBACK_SESSION_KEY) !== null
  } catch {
    return false
  }
}

const writePlaybackSession = (): void => {
  try {
    sessionStorage.setItem(ENTRY_PLAYBACK_SESSION_KEY, 'true')
  } catch {
    // Storage restrictions must not prevent entry dialogue playback.
  }
}

export interface CreateEntryEventPlaybackOptions {
  readonly eventDialogueIds: Accessor<EventDialogueIds>
  readonly eventPlaybackModes: Accessor<EventPlaybackModes>
  readonly getRepository: () => PDialogueRepository | null
  readonly isPlaybackEnabled: () => boolean
  readonly playback: EntryPlaybackController
}

export interface EntryEventPlayback {
  readonly enterFocusRoom: () => void
  readonly hasEnteredFocusRoom: Accessor<boolean>
  readonly tryPlay: () => void
}

/** Applies focus-room entry policy independently from binding persistence. */
export const createEntryEventPlayback = (
  options: CreateEntryEventPlaybackOptions,
): EntryEventPlayback => {
  const [hasEnteredFocusRoom, setHasEnteredFocusRoom] = createSignal(false)
  let hasStarted = false

  const tryPlay = () => {
    const repository = options.getRepository()
    if (
      hasStarted ||
      !hasEnteredFocusRoom() ||
      !options.isPlaybackEnabled() ||
      repository === null ||
      readPlaybackSession()
    ) {
      return
    }

    const dialogueIds = options.eventDialogueIds()[FOCUS_ROOM_ENTRY_EVENT] ?? []
    const playbackMode =
      options.eventPlaybackModes()[FOCUS_ROOM_ENTRY_EVENT] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE
    const selectedDialogueIds = selectEventDialogues({dialogueIds, playbackMode})

    if (selectedDialogueIds.length === 0) {
      return
    }

    hasStarted = true
    writePlaybackSession()
    options.playback
      .playSequence(repository, {
        dialogueIds: selectedDialogueIds,
        onDialogueStart: () => undefined,
        onSequenceStop: () => undefined,
      })
      .catch((error: unknown) => {
        console.error('Unexpected entry dialogue sequence failure.', error)
      })
  }

  return {
    enterFocusRoom() {
      if (hasEnteredFocusRoom()) {
        return
      }

      setHasEnteredFocusRoom(true)
      tryPlay()
    },
    hasEnteredFocusRoom,
    tryPlay,
  }
}
