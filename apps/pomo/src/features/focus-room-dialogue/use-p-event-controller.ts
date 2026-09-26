import {uniq} from 'es-toolkit/array'
import {setOptionalRecordEntry} from 'src/utils/set-optional-record-entry'
import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'
import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {createEntryPlaybackController} from './entry-playback-controller'
import {MAX_LATEST_REPLACEMENT_DIALOGUE_IDS} from './dialogue-playback-policy'
import {getEventActionIds, updateEventActionBinding} from './event-actions'
import {
  type EventActionIds,
  type EventBindingItem,
  type EventDialogueIds,
  type EventPlaybackModes,
  type PEventContextValue,
  type PlayDialogueEventsOptions,
} from './event-context'
import {
  DEFAULT_DELAYED_END_EVENT_SETTINGS,
  parseDelayedEndEventSettings,
  readDelayedEndEventSettings,
  writeDelayedEndEventSettings,
} from './delayed-end-event-settings'
import {selectDialogueIdsForEvents} from './event-playback'
import {createDelayedEndEventPlayback} from './use-p-event-controller/delayed-end-playback'
import {createEventActionRunner} from './use-p-event-controller/event-action-runner'
import {createEntryEventPlayback} from './use-p-event-controller/entry-playback'
import {useDelayedEndEvent} from './use-delayed-end-event'
import type {PDialogueRepository} from './repository'
import {
  DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
  type DialogueEventBinding,
  type DialogueEventId,
  type DialogueEventPlaybackMode,
  type EventActionId,
  FOCUS_ROOM_ENTRY_EVENT,
  type PDialogue,
} from './schema'
import * as m from '@paraglide/message'

export interface UsePEventControllerProps {
  readonly isDelayedEndEventEnabled?: boolean
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
): EventDialogueIds =>
  setOptionalRecordEntry(bindings, eventId, dialogueIds.length === 0 ? null : dialogueIds)

const updateEventPlaybackMode = (
  modes: EventPlaybackModes,
  eventId: DialogueEventId,
  playbackMode: DialogueEventPlaybackMode | null,
): EventPlaybackModes => setOptionalRecordEntry(modes, eventId, playbackMode)

// oxlint-disable-next-line eslint/max-lines-per-function -- One hook coordinates repository initialization, bindings, and queued playback lifecycle.
export const usePEventController = (props: UsePEventControllerProps): PEventContextValue => {
  const playback = createEntryPlaybackController()
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<PDialogue>>([])
  const [eventDialogueIds, setEventDialogueIds] = createSignal<EventDialogueIds>({})
  const [eventActionIds, setEventActionIds] = createSignal<EventActionIds>({})
  const [eventPlaybackModes, setEventPlaybackModes] = createSignal<EventPlaybackModes>({})
  const [delayedEndEventDurationMinutes, setDelayedEndEventDurationMinutes] = createSignal<number>(
    DEFAULT_DELAYED_END_EVENT_SETTINGS.durationMinutes,
  )
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  let repository: PDialogueRepository | null = null
  let isDisposed = false
  const bindingUpdates = createSerialTaskQueue()
  let bindingRevision = 0
  const eventBindingRevisions: Partial<Record<DialogueEventId, number>> = {}
  let persistedBindings: EventDialogueIds = {}
  let persistedActionBindings: EventActionIds = {}
  let persistedPlaybackModes: EventPlaybackModes = {}
  let persistedDelayedEndEventDurationMinutes: number =
    DEFAULT_DELAYED_END_EVENT_SETTINGS.durationMinutes
  let delayedEndEventDurationRevision = 0
  const beforePlaybackCallbacks = new Set<() => void>()
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

  const eventActionRunner = createEventActionRunner(eventActionIds)

  const isPlaybackEnabled = () => props.isPlaybackEnabled ?? true
  const entryPlayback = createEntryEventPlayback({
    eventDialogueIds,
    eventPlaybackModes,
    getRepository: () => (isDisposed || isLoading() ? null : repository),
    isPlaybackEnabled,
    onEvent: () => {
      const result = eventActionRunner.run([FOCUS_ROOM_ENTRY_EVENT])
      return result.kind === 'queued' ? result.completion : undefined
    },
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
      const [storedDialogues, eventBindings, delayedEndEventSettings] = await Promise.all([
        currentRepository.listDialogues(),
        currentRepository.listEventBindings(),
        readDelayedEndEventSettings(),
      ])

      if (isDisposed) {
        return
      }

      const storedBindings = getEventDialogueIds(eventBindings)
      const storedActionBindings = getEventActionIds(eventBindings)
      const storedPlaybackModes = getEventPlaybackModes(eventBindings)
      setDialogues(storedDialogues)
      persistedBindings = storedBindings
      persistedActionBindings = storedActionBindings
      persistedPlaybackModes = storedPlaybackModes
      persistedDelayedEndEventDurationMinutes = delayedEndEventSettings.durationMinutes
      setEventDialogueIds(storedBindings)
      setEventActionIds(storedActionBindings)
      setEventPlaybackModes(storedPlaybackModes)
      setDelayedEndEventDurationMinutes(delayedEndEventSettings.durationMinutes)
      setErrorMessage(null)
      setIsLoading(false)
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
    actionIds: ReadonlyArray<EventActionId> = eventActionIds()[eventId] ?? [],
  ) => {
    const uniqueDialogueIds = uniq(dialogueIds)
    const uniqueActionIds = uniq(actionIds)
    const hasBinding = uniqueDialogueIds.length > 0 || uniqueActionIds.length > 0
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
    setEventActionIds((currentBindings) =>
      updateEventActionBinding(currentBindings, eventId, uniqueActionIds),
    )
    const update = bindingUpdates.run(() => {
      const currentRepository = getRepository()
      return uniqueActionIds.length === 0
        ? currentRepository.setEventBinding(eventId, uniqueDialogueIds, playbackMode)
        : currentRepository.setEventBinding(
            eventId,
            uniqueDialogueIds,
            playbackMode,
            uniqueActionIds,
          )
    })

    try {
      await update
      persistedBindings = updateEventBinding(persistedBindings, eventId, uniqueDialogueIds)
      persistedActionBindings = updateEventActionBinding(
        persistedActionBindings,
        eventId,
        uniqueActionIds,
      )
      persistedPlaybackModes = updateEventPlaybackMode(
        persistedPlaybackModes,
        eventId,
        hasBinding && uniqueDialogueIds.length > 0 ? playbackMode : null,
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
        setEventActionIds((currentBindings) =>
          updateEventActionBinding(
            currentBindings,
            eventId,
            persistedActionBindings[eventId] ?? [],
          ),
        )
        setEventPlaybackModes((currentModes) =>
          updateEventPlaybackMode(currentModes, eventId, persistedPlaybackModes[eventId] ?? null),
        )
      }

      throw error
    }
  }

  const playDialogueEvents = async (
    eventIds: ReadonlyArray<DialogueEventId>,
    onBeforePlayback?: () => void,
    options?: PlayDialogueEventsOptions,
  ): Promise<void> => {
    if (!isPlaybackEnabled()) {
      return
    }

    if (repository === null) {
      await initialization
    }

    if (isDisposed || !isPlaybackEnabled() || repository === null) {
      return
    }

    const actionExecution = eventActionRunner.run(eventIds)
    if (actionExecution.kind === 'queued') {
      await actionExecution.completion

      if (isDisposed || !isPlaybackEnabled() || repository === null) {
        return
      }
    }

    const bindings = eventDialogueIds()
    const playbackModes = eventPlaybackModes()
    const dialogueIds = selectDialogueIdsForEvents(
      eventIds,
      bindings,
      playbackModes,
      options?.replacementPolicy === 'latest' ? MAX_LATEST_REPLACEMENT_DIALOGUE_IDS : undefined,
    )

    if (dialogueIds.length > 0) {
      onBeforePlayback?.()
      const sequenceOptions = {
        dialogueIds,
        onDialogueStart: () => undefined,
        onSequenceStop: () => undefined,
        ...(options?.replacementPolicy === 'latest' ? {replacementPolicy: 'latest' as const} : {}),
      }
      await playback.playSequence(repository, sequenceOptions)
    }
  }

  const delayedEndPlayback = createDelayedEndEventPlayback({
    beforePlaybackCallbacks,
    isPlaybackEnabled,
    playDialogueEvents,
  })

  const delayedEndEvent = useDelayedEndEvent({
    isEnabled: () => props.isDelayedEndEventEnabled ?? isPlaybackEnabled(),
    onEvent: delayedEndPlayback.request,
  })

  const setDelayedEndEventDuration = async (durationMinutes: number): Promise<void> => {
    const nextSettings = parseDelayedEndEventSettings({durationMinutes, version: 1})

    if (nextSettings === null) {
      throw new Error('지정 시간은 1~120분 사이의 정수여야 해요.')
    }

    const currentRevision = (delayedEndEventDurationRevision += 1)
    setDelayedEndEventDurationMinutes(nextSettings.durationMinutes)

    try {
      await writeDelayedEndEventSettings(nextSettings)
      if (currentRevision === delayedEndEventDurationRevision) {
        persistedDelayedEndEventDurationMinutes = nextSettings.durationMinutes
      }
    } catch (error: unknown) {
      if (!isDisposed && currentRevision === delayedEndEventDurationRevision) {
        setDelayedEndEventDurationMinutes(persistedDelayedEndEventDurationMinutes)
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
    cancelDelayedEndEvent: () => {
      delayedEndEvent.cancel()
      delayedEndPlayback.clearPendingEvent()
    },
    delayedEndEventDurationMinutes,
    delayedEndEventIsRunning: delayedEndEvent.isRunning,
    async deleteDialogue(dialogueId) {
      await bindingUpdates.settle()
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
    eventActionIds,
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
        return false
      }

      if (repository === null) {
        await initialization
      }

      if (isDisposed || !isPlaybackEnabled() || repository === null) {
        return false
      }

      return playback.prepare(repository, dialogueId)
    },
    playDialogueEvents,
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
      await bindingUpdates.settle()

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
          const storedActionBindings = getEventActionIds(eventBindings)
          const storedPlaybackModes = getEventPlaybackModes(eventBindings)
          persistedBindings = storedBindings
          persistedActionBindings = storedActionBindings
          persistedPlaybackModes = storedPlaybackModes
          setEventDialogueIds(storedBindings)
          setEventActionIds(storedActionBindings)
          setEventPlaybackModes(storedPlaybackModes)
        }
      }
    },
    registerBeforePlayback: (callback) => {
      beforePlaybackCallbacks.add(callback)
      return () => {
        beforePlaybackCallbacks.delete(callback)
      }
    },
    registerEventActionExecutor: eventActionRunner.register,
    registerEventActionHandler: eventActionRunner.registerHandler,
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
    setDelayedEndEventDuration,
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
    setEventItems: (eventId, items) => {
      const dialogueIds = items.flatMap((item) => (item.type === 'dialogue' ? [item.id] : []))
      const actionIds = items.flatMap((item) => (item.type === 'action' ? [item.id] : []))
      return persistEventBinding(
        eventId,
        dialogueIds,
        eventPlaybackModes()[eventId] ?? DEFAULT_DIALOGUE_EVENT_PLAYBACK_MODE,
        actionIds,
      )
    },
    setEventPlaybackMode: (eventId, playbackMode) => {
      const dialogueIds = eventDialogueIds()[eventId] ?? []

      if (dialogueIds.length === 0) {
        return Promise.resolve()
      }

      return persistEventBinding(eventId, dialogueIds, playbackMode)
    },
    skipDialoguePlayback: playback.skip,
    startDelayedEndEvent: () => {
      delayedEndEvent.start(delayedEndEventDurationMinutes())
      if (delayedEndEvent.isRunning()) {
        delayedEndPlayback.clearPendingEvent()
        if (delayedEndPlayback.isActive()) {
          playback.cancel()
        }
      }
    },
  }

  onMount(() => {
    initializeEvents().catch((error: unknown) => {
      console.error('Unexpected focus room event initialization failure.', error)
    })
  })

  createEffect(() => {
    if (isPlaybackEnabled()) {
      entryPlayback.tryPlay()

      if (delayedEndPlayback.hasPendingEvent()) {
        delayedEndPlayback.request().catch((error: unknown) => {
          console.error('Failed to catch up the delayed-end event.', error)
        })
      }
    } else {
      // AI_NOTE - Route suspension cancels without stop callbacks so queued feeds are not marked listened.
      eventActionRunner.clearDelayedEndActions()
      delayedEndPlayback.retainPendingEventOnSuspension()
      playback.cancel()
    }
  })

  onCleanup(() => {
    isDisposed = true
    eventActionRunner.dispose()
    beforePlaybackCallbacks.clear()
    resolveInitialization?.()
    playback.dispose()
    repository?.dispose()
  })

  return contextValue
}
