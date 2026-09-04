import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {createEntryPlaybackController} from './entry-playback-controller'
import {
  type EventDialogueIds,
  type EventPlaybackModes,
  type PEventContextValue,
} from './event-context'
import {selectEventDialogues} from './event-playback'
import {createEntryEventPlayback} from './use-p-event-controller/entry-playback'
import type {PDialogueRepository} from './repository'
import {
  DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
  type DialogueEventBinding,
  type DialogueEventId,
  type DialogueEventPlaybackMode,
  FOCUS_ROOM_ENTRY_EVENT,
  type PDialogue,
} from './schema'
import * as m from '@paraglide/message'

export interface UsePEventControllerProps {
  readonly isPlaybackEnabled?: boolean
}

const getEventDialogueIds = (bindings: ReadonlyArray<DialogueEventBinding>): EventDialogueIds =>
  Object.fromEntries(bindings.map((binding) => [binding.event, binding.dialogueIds]))

const getEventPlaybackModes = (bindings: ReadonlyArray<DialogueEventBinding>): EventPlaybackModes =>
  Object.fromEntries(bindings.map((binding) => [binding.event, binding.playbackMode]))

const removeDialogueFromBindings = (
  bindings: EventDialogueIds,
  dialogueId: string,
): EventDialogueIds =>
  Object.fromEntries(
    Object.entries(bindings).flatMap(([eventId, dialogueIds]) => {
      const remainingIds = dialogueIds.filter((id) => id !== dialogueId)
      return remainingIds.length === 0 ? [] : [[eventId, remainingIds]]
    }),
  )

const updateEventBinding = (
  bindings: EventDialogueIds,
  eventId: DialogueEventId,
  dialogueIds: ReadonlyArray<string>,
): EventDialogueIds => {
  const nextBindings = {...bindings}

  if (dialogueIds.length === 0) {
    delete nextBindings[eventId]
  } else {
    nextBindings[eventId] = dialogueIds
  }

  return nextBindings
}

const updateEventPlaybackMode = (
  modes: EventPlaybackModes,
  eventId: DialogueEventId,
  playbackMode: DialogueEventPlaybackMode | null,
): EventPlaybackModes => {
  const nextModes = {...modes}

  if (playbackMode === null) {
    delete nextModes[eventId]
  } else {
    nextModes[eventId] = playbackMode
  }

  return nextModes
}

// oxlint-disable-next-line eslint/max-lines-per-function -- One hook coordinates repository initialization, bindings, and queued playback lifecycle.
export const usePEventController = (props: UsePEventControllerProps): PEventContextValue => {
  const playback = createEntryPlaybackController()
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<PDialogue>>([])
  const [eventDialogueIds, setEventDialogueIds] = createSignal<EventDialogueIds>({})
  const [eventPlaybackModes, setEventPlaybackModes] = createSignal<EventPlaybackModes>({})
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  let repository: PDialogueRepository | null = null
  let isDisposed = false
  let bindingUpdate = Promise.resolve()
  let bindingRevision = 0
  const eventBindingRevisions: Partial<Record<DialogueEventId, number>> = {}
  let persistedBindings: EventDialogueIds = {}
  let persistedPlaybackModes: EventPlaybackModes = {}
  let resolveInitialization: (() => void) | null = null
  const initialization = new Promise<void>((resolve) => {
    resolveInitialization = resolve
  })

  const getRepository = () => {
    if (repository === null) {
      throw new Error('Pomo 이벤트 저장소가 아직 준비되지 않았어요.')
    }

    return repository
  }

  const isPlaybackEnabled = () => props.isPlaybackEnabled ?? true
  const entryPlayback = createEntryEventPlayback({
    eventDialogueIds,
    eventPlaybackModes,
    getRepository: () => repository,
    isPlaybackEnabled,
    playback,
  })

  const initializeEvents = async () => {
    try {
      const repositoryModule = await import('./repository')

      if (isDisposed) {
        return
      }

      const currentRepository = repositoryModule.createPDialogueRepository()
      repository = currentRepository
      const [storedDialogues, eventBindings] = await Promise.all([
        currentRepository.listDialogues(),
        currentRepository.listEventBindings(),
      ])

      if (isDisposed) {
        return
      }

      const storedBindings = getEventDialogueIds(eventBindings)
      const storedPlaybackModes = getEventPlaybackModes(eventBindings)
      setDialogues(storedDialogues)
      persistedBindings = storedBindings
      persistedPlaybackModes = storedPlaybackModes
      setEventDialogueIds(storedBindings)
      setEventPlaybackModes(storedPlaybackModes)
      setErrorMessage(null)

      entryPlayback.tryPlay()
    } catch (error: unknown) {
      if (isDisposed) {
        return
      }

      console.error('Failed to initialize focus room events.', error)
      setErrorMessage(m.settings_events_loading_failed())
    } finally {
      if (!isDisposed) {
        setIsLoading(false)
      }

      resolveInitialization?.()
    }
  }

  const persistEventBinding = async (
    eventId: DialogueEventId,
    dialogueIds: ReadonlyArray<string>,
    playbackMode: DialogueEventPlaybackMode,
  ) => {
    const uniqueDialogueIds = [...new Set(dialogueIds)]
    bindingRevision += 1
    const currentEventRevision = (eventBindingRevisions[eventId] ?? 0) + 1
    eventBindingRevisions[eventId] = currentEventRevision
    setEventDialogueIds((currentBindings) =>
      updateEventBinding(currentBindings, eventId, uniqueDialogueIds),
    )
    setEventPlaybackModes((currentModes) =>
      updateEventPlaybackMode(
        currentModes,
        eventId,
        uniqueDialogueIds.length === 0 ? null : playbackMode,
      ),
    )
    const update = bindingUpdate
      .catch(() => undefined)
      .then(() => getRepository().setEventBinding(eventId, uniqueDialogueIds, playbackMode))
    bindingUpdate = update

    try {
      await update
      persistedBindings = updateEventBinding(persistedBindings, eventId, uniqueDialogueIds)
      persistedPlaybackModes = updateEventPlaybackMode(
        persistedPlaybackModes,
        eventId,
        uniqueDialogueIds.length === 0 ? null : playbackMode,
      )

      if (!isDisposed) {
        if (eventId === FOCUS_ROOM_ENTRY_EVENT) {
          entryPlayback.tryPlay()
        }
      }
    } catch (error: unknown) {
      if (!isDisposed && currentEventRevision === eventBindingRevisions[eventId]) {
        setEventDialogueIds((currentBindings) =>
          updateEventBinding(currentBindings, eventId, persistedBindings[eventId] ?? []),
        )
        setEventPlaybackModes((currentModes) =>
          updateEventPlaybackMode(currentModes, eventId, persistedPlaybackModes[eventId] ?? null),
        )
      }

      throw error
    }
  }

  const contextValue: PEventContextValue = {
    activeDialogueId: playback.activeDialogueId,
    activeSegmentCount: playback.activeSegmentCount,
    activeSegmentMood: playback.activeSegmentMood,
    activeSegmentPosition: playback.activeSegmentPosition,
    activeText: playback.activeText,
    activeViseme: playback.activeViseme,
    async deleteDialogue(dialogueId) {
      await bindingUpdate.catch(() => undefined)
      await getRepository().deleteDialogue(dialogueId)

      if (isDisposed) {
        return
      }

      setDialogues((currentDialogues) =>
        currentDialogues.filter((dialogue) => dialogue.id !== dialogueId),
      )
      bindingRevision += 1
      const remainingBindings = removeDialogueFromBindings(eventDialogueIds(), dialogueId)
      const remainingPlaybackModes = Object.fromEntries(
        Object.entries(eventPlaybackModes()).filter(
          ([eventId]) => remainingBindings[eventId as DialogueEventId] !== undefined,
        ),
      ) satisfies EventPlaybackModes
      persistedBindings = remainingBindings
      persistedPlaybackModes = remainingPlaybackModes
      setEventDialogueIds(remainingBindings)
      setEventPlaybackModes(remainingPlaybackModes)
    },
    dialogues,
    enterFocusRoom: entryPlayback.enterFocusRoom,
    entryDialogueId: () => eventDialogueIds()[FOCUS_ROOM_ENTRY_EVENT]?.[0] ?? null,
    entryDialogueIds: () => eventDialogueIds()[FOCUS_ROOM_ENTRY_EVENT] ?? [],
    errorMessage,
    eventDialogueIds,
    eventPlaybackModes,
    getAudio: (audioKey) => getRepository().getAudio(audioKey),
    hasEnteredFocusRoom: entryPlayback.hasEnteredFocusRoom,
    isDialoguePlaybackBlocked: playback.isBlocked,
    isDialoguePlaying: playback.isPlaying,
    isDialogueScheduled: playback.isDialogueScheduled,
    isEntryPlaybackBlocked: playback.isBlocked,
    isLoading,
    onStopDialoguePlayback: playback.stop,
    onStopEntryPlayback: playback.stop,
    async playDialogue(dialogueId) {
      if (!isPlaybackEnabled()) {
        return
      }

      if (repository === null) {
        await initialization
      }

      if (!isDisposed && isPlaybackEnabled() && repository !== null) {
        await playback.prepare(repository, dialogueId)
      }
    },
    async playDialogueEvents(eventIds, onBeforePlayback) {
      if (!isPlaybackEnabled()) {
        return
      }

      if (repository === null) {
        await initialization
      }

      if (isDisposed || !isPlaybackEnabled() || repository === null) {
        return
      }

      const bindings = eventDialogueIds()
      const playbackModes = eventPlaybackModes()
      const dialogueIds = eventIds.flatMap((eventId) =>
        selectEventDialogues({
          dialogueIds: bindings[eventId] ?? [],
          playbackMode: playbackModes[eventId] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
        }),
      )

      if (dialogueIds.length > 0) {
        onBeforePlayback?.()
        await playback.playSequence(repository, {
          dialogueIds,
          onDialogueStart: () => undefined,
          onSequenceStop: () => undefined,
        })
      }
    },
    async playDialogueSequence(options) {
      if (!isPlaybackEnabled()) {
        return
      }

      if (repository === null) {
        await initialization
      }

      if (!isDisposed && isPlaybackEnabled() && repository !== null) {
        await playback.playSequence(repository, options)
      }
    },
    async refreshDialogues() {
      await initialization
      await bindingUpdate.catch(() => undefined)

      if (isDisposed || repository === null) {
        return
      }

      const refreshRevision = bindingRevision
      const [storedDialogues, eventBindings] = await Promise.all([
        repository.listDialogues(),
        repository.listEventBindings(),
      ])

      if (!isDisposed) {
        setDialogues(storedDialogues)

        if (refreshRevision === bindingRevision) {
          const storedBindings = getEventDialogueIds(eventBindings)
          const storedPlaybackModes = getEventPlaybackModes(eventBindings)
          persistedBindings = storedBindings
          persistedPlaybackModes = storedPlaybackModes
          setEventDialogueIds(storedBindings)
          setEventPlaybackModes(storedPlaybackModes)
        }
      }
    },
    retryDialoguePlayback: () => {
      if (isPlaybackEnabled()) {
        playback.retry()
      }
    },
    retryEntryPlayback: () => {
      if (isPlaybackEnabled()) {
        playback.retry()
      }
    },
    scheduledDialogueCount: playback.scheduledDialogueCount,
    setEntryDialogue: (dialogueId) =>
      persistEventBinding(
        FOCUS_ROOM_ENTRY_EVENT,
        dialogueId === null ? [] : [dialogueId],
        eventPlaybackModes()[FOCUS_ROOM_ENTRY_EVENT] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
      ),
    setEntryDialogues: (dialogueIds) =>
      persistEventBinding(
        FOCUS_ROOM_ENTRY_EVENT,
        dialogueIds,
        eventPlaybackModes()[FOCUS_ROOM_ENTRY_EVENT] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
      ),
    setEventDialogue: (eventId, dialogueId) =>
      persistEventBinding(
        eventId,
        dialogueId === null ? [] : [dialogueId],
        eventPlaybackModes()[eventId] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
      ),
    setEventDialogues: (eventId, dialogueIds) =>
      persistEventBinding(
        eventId,
        dialogueIds,
        eventPlaybackModes()[eventId] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
      ),
    setEventPlaybackMode: (eventId, playbackMode) => {
      const dialogueIds = eventDialogueIds()[eventId] ?? []

      if (dialogueIds.length === 0) {
        return Promise.resolve()
      }

      return persistEventBinding(eventId, dialogueIds, playbackMode)
    },
    skipDialoguePlayback: playback.skip,
  }

  onMount(() => {
    initializeEvents().catch((error: unknown) => {
      console.error('Unexpected focus room event initialization failure.', error)
    })
  })

  createEffect(() => {
    if (isPlaybackEnabled()) {
      entryPlayback.tryPlay()
    } else {
      // AI_NOTE - Route suspension cancels without stop callbacks so queued feeds are not marked listened.
      playback.cancel()
    }
  })

  onCleanup(() => {
    isDisposed = true
    resolveInitialization?.()
    playback.dispose()
    repository?.dispose()
  })

  return contextValue
}
