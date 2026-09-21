import {createPresenceFlag} from '../../value-storage'
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

const failedSessionWrites = new WeakSet<EntryPlaybackSessionStorage>()

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
  let resolvedSessionStorage: EntryPlaybackSessionStorage | undefined
  const resolveSessionStorage = () => {
    resolvedSessionStorage = undefined
    const storage = options.sessionStorage ?? globalThis.sessionStorage
    resolvedSessionStorage = storage
    return storage
  }
  const sessionFlag = createPresenceFlag({
    key: ENTRY_PLAYBACK_SESSION_KEY,
    storage: resolveSessionStorage,
  })
  const readSessionFlag = () =>
    sessionFlag.read() ||
    (resolvedSessionStorage !== undefined && failedSessionWrites.has(resolvedSessionStorage))
  const writeSessionFlag = () => {
    const didWrite = sessionFlag.write()

    if (didWrite || resolvedSessionStorage === undefined) {
      return
    }

    failedSessionWrites.add(resolvedSessionStorage)
  }
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

    if (readSessionFlag()) {
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
      if (currentRepository === null || !options.isPlaybackEnabled() || readSessionFlag()) {
        isPlaybackPending = false
        return
      }

      pendingEventExecution = undefined
      hasStarted = true
      let hasPlayedDialogue = false
      isPlaybackPending = false
      options.playback
        .playSequence(currentRepository, {
          dialogueIds: selectedDialogueIds,
          onDialogueStart: () => {
            hasPlayedDialogue = true
          },
          onSequenceStop: () => undefined,
        })
        .then((completion) => {
          if (!hasPlayedDialogue || completion === 'failed' || completion === 'cancelled') {
            hasStarted = false
            return
          }

          writeSessionFlag()
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
      hasTriggeredEvent = false
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
