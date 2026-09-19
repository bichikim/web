import {type Accessor, createSignal} from 'solid-js'

import type {EntryPlaybackController} from '../entry-playback-controller'
import type {EventDialogueIds, EventPlaybackModes} from '../event-context'
import {selectEventDialogues} from '../event-playback'
import type {PDialogueRepository} from '../repository'
import {DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE, FOCUS_ROOM_ENTRY_EVENT} from '../schema'

const ENTRY_PLAYBACK_SESSION_KEY = 'pomo:focus-room-entry-playback:v1'

export interface EntryPlaybackSessionStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const getStorage = (storage?: EntryPlaybackSessionStorage): EntryPlaybackSessionStorage =>
  storage ?? globalThis.sessionStorage

const readPlaybackSession = (storage?: EntryPlaybackSessionStorage): boolean => {
  try {
    return getStorage(storage).getItem(ENTRY_PLAYBACK_SESSION_KEY) !== null
  } catch {
    return false
  }
}

const writePlaybackSession = (storage?: EntryPlaybackSessionStorage): void => {
  try {
    getStorage(storage).setItem(ENTRY_PLAYBACK_SESSION_KEY, 'true')
  } catch {
    // Storage restrictions must not prevent entry dialogue playback.
  }
}

export interface CreateEntryEventPlaybackOptions {
  readonly eventDialogueIds: Accessor<EventDialogueIds>
  readonly eventPlaybackModes: Accessor<EventPlaybackModes>
  readonly getRepository: () => PDialogueRepository | null
  readonly isPlaybackEnabled: () => boolean
  readonly onEvent?: () => Promise<void> | void
  readonly playback: EntryPlaybackController
  readonly sessionStorage?: EntryPlaybackSessionStorage
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
  let hasTriggeredEvent = false
  let isPlaybackPending = false
  let pendingEventExecution: Promise<void> | undefined

  const tryPlay = () => {
    const repository = options.getRepository()
    if (
      hasStarted ||
      isPlaybackPending ||
      !hasEnteredFocusRoom() ||
      !options.isPlaybackEnabled() ||
      repository === null
    ) {
      return
    }

    if (!hasTriggeredEvent) {
      hasTriggeredEvent = true
      const eventExecution = options.onEvent?.()
      pendingEventExecution = eventExecution instanceof Promise ? eventExecution : undefined
    }

    if (readPlaybackSession(options.sessionStorage)) {
      return
    }

    const dialogueIds = options.eventDialogueIds()[FOCUS_ROOM_ENTRY_EVENT] ?? []
    const playbackMode =
      options.eventPlaybackModes()[FOCUS_ROOM_ENTRY_EVENT] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE
    const selectedDialogueIds = selectEventDialogues({dialogueIds, playbackMode})

    if (selectedDialogueIds.length === 0) {
      return
    }

    const startPlayback = () => {
      const currentRepository = options.getRepository()
      if (
        currentRepository === null ||
        !options.isPlaybackEnabled() ||
        readPlaybackSession(options.sessionStorage)
      ) {
        isPlaybackPending = false
        return
      }

      pendingEventExecution = undefined
      hasStarted = true
      isPlaybackPending = false
      options.playback
        .playSequence(currentRepository, {
          dialogueIds: selectedDialogueIds,
          onDialogueStart: () => undefined,
          onSequenceStop: () => undefined,
        })
        .then((completion) => {
          if (completion === 'failed' || completion === 'cancelled') {
            hasStarted = false
            return
          }

          writePlaybackSession(options.sessionStorage)
        })
        .catch((error: unknown) => {
          hasStarted = false
          console.error('Unexpected entry dialogue sequence failure.', error)
        })
    }

    if (pendingEventExecution === undefined) {
      startPlayback()
      return
    }

    isPlaybackPending = true
    const eventExecution = pendingEventExecution
    pendingEventExecution = eventExecution.then(startPlayback).catch((error: unknown) => {
      pendingEventExecution = undefined
      isPlaybackPending = false
      console.error('Unexpected entry event action execution failure.', error)
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
