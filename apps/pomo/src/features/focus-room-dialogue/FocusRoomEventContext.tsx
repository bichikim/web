import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js'

import {
  createEntryPlaybackController,
  type PlayFocusRoomDialogueSequenceOptions,
} from './entry-playback-controller'
import type {FocusRoomDialogueRepository} from './repository'
import {
  type DialogueEventBinding,
  type DialogueEventId,
  FOCUS_ROOM_ENTRY_EVENT,
  type FocusRoomDialogue,
} from './schema'

export type {PlayFocusRoomDialogueSequenceOptions} from './entry-playback-controller'

type EventDialogueIds = Readonly<Partial<Record<DialogueEventId, ReadonlyArray<string>>>>

export interface FocusRoomEventContextValue {
  readonly activeDialogueId: Accessor<string | null>
  readonly activeSegmentCount: Accessor<number>
  readonly activeSegmentPosition: Accessor<number | null>
  readonly activeText: Accessor<string | null>
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dialogues: Accessor<ReadonlyArray<FocusRoomDialogue>>
  readonly entryDialogueId: Accessor<string | null>
  readonly entryDialogueIds: Accessor<ReadonlyArray<string>>
  readonly errorMessage: Accessor<string | null>
  readonly eventDialogueIds: Accessor<EventDialogueIds>
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly isDialoguePlaybackBlocked: Accessor<boolean>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
  readonly isEntryPlaybackBlocked: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly onStopDialoguePlayback: () => void
  readonly onStopEntryPlayback: () => void
  readonly playDialogue: (dialogueId: string) => Promise<void>
  readonly playDialogueEvents: (
    eventIds: ReadonlyArray<DialogueEventId>,
    onBeforePlayback?: () => void,
  ) => Promise<void>
  readonly playDialogueSequence: (options: PlayFocusRoomDialogueSequenceOptions) => Promise<void>
  readonly refreshDialogues: () => Promise<void>
  readonly retryDialoguePlayback: () => void
  readonly retryEntryPlayback: () => void
  readonly setEntryDialogue: (dialogueId: string | null) => Promise<void>
  readonly setEntryDialogues: (dialogueIds: ReadonlyArray<string>) => Promise<void>
  readonly setEventDialogue: (eventId: DialogueEventId, dialogueId: string | null) => Promise<void>
  readonly setEventDialogues: (
    eventId: DialogueEventId,
    dialogueIds: ReadonlyArray<string>,
  ) => Promise<void>
}

export interface FocusRoomEventProviderProps {
  readonly children: JSX.Element
}

const FocusRoomEventContext = createContext<FocusRoomEventContextValue>()

const getEventDialogueIds = (bindings: ReadonlyArray<DialogueEventBinding>): EventDialogueIds =>
  Object.fromEntries(bindings.map((binding) => [binding.event, binding.dialogueIds]))

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

// oxlint-disable-next-line eslint/max-lines-per-function -- One provider coordinates repository initialization, bindings, and queued playback lifecycle.
export const FocusRoomEventProvider = (props: FocusRoomEventProviderProps) => {
  const playback = createEntryPlaybackController()
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FocusRoomDialogue>>([])
  const [eventDialogueIds, setEventDialogueIds] = createSignal<EventDialogueIds>({})
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  let repository: FocusRoomDialogueRepository | null = null
  let isDisposed = false
  let bindingUpdate = Promise.resolve()
  let bindingRevision = 0
  let persistedBindings: EventDialogueIds = {}
  let resolveInitialization: (() => void) | null = null
  const initialization = new Promise<void>((resolve) => {
    resolveInitialization = resolve
  })

  const getRepository = () => {
    if (repository === null) {
      throw new Error('집중룸 이벤트 저장소가 아직 준비되지 않았어요.')
    }

    return repository
  }

  const initializeEvents = async () => {
    try {
      const repositoryModule = await import('./repository')

      if (isDisposed) {
        return
      }

      const currentRepository = repositoryModule.createFocusRoomDialogueRepository()
      repository = currentRepository
      const [storedDialogues, eventBindings] = await Promise.all([
        currentRepository.listDialogues(),
        currentRepository.listEventBindings(),
      ])

      if (isDisposed) {
        return
      }

      const storedBindings = getEventDialogueIds(eventBindings)
      setDialogues(storedDialogues)
      persistedBindings = storedBindings
      setEventDialogueIds(storedBindings)
      setErrorMessage(null)

      const entryDialogueIds = storedBindings[FOCUS_ROOM_ENTRY_EVENT] ?? []
      if (entryDialogueIds.length > 0) {
        playback
          .playSequence(currentRepository, {
            dialogueIds: entryDialogueIds,
            onDialogueStart: () => undefined,
            onSequenceStop: () => undefined,
          })
          .catch((error: unknown) => {
            console.error('Unexpected entry dialogue sequence failure.', error)
          })
      }
    } catch (error: unknown) {
      if (isDisposed) {
        return
      }

      console.error('Failed to initialize focus room events.', error)
      setErrorMessage('이벤트와 저장된 대화를 불러오지 못했어요.')
    } finally {
      if (!isDisposed) {
        setIsLoading(false)
      }

      resolveInitialization?.()
    }
  }

  const setEventDialogues = async (
    eventId: DialogueEventId,
    dialogueIds: ReadonlyArray<string>,
  ) => {
    const uniqueDialogueIds = [...new Set(dialogueIds)]
    bindingRevision += 1
    const currentRevision = bindingRevision
    setEventDialogueIds((currentBindings) =>
      updateEventBinding(currentBindings, eventId, uniqueDialogueIds),
    )
    const update = bindingUpdate
      .catch(() => undefined)
      .then(() => getRepository().setEventBinding(eventId, uniqueDialogueIds))
    bindingUpdate = update

    try {
      await update
      persistedBindings = updateEventBinding(persistedBindings, eventId, uniqueDialogueIds)
    } catch (error: unknown) {
      if (!isDisposed && currentRevision === bindingRevision) {
        setEventDialogueIds(persistedBindings)
      }

      throw error
    }
  }

  const contextValue: FocusRoomEventContextValue = {
    activeDialogueId: playback.activeDialogueId,
    activeSegmentCount: playback.activeSegmentCount,
    activeSegmentPosition: playback.activeSegmentPosition,
    activeText: playback.activeText,
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
      persistedBindings = remainingBindings
      setEventDialogueIds(remainingBindings)

      if (playback.isDialogueScheduled(dialogueId)) {
        playback.cancel()
      }
    },
    dialogues,
    entryDialogueId: () => eventDialogueIds()[FOCUS_ROOM_ENTRY_EVENT]?.[0] ?? null,
    entryDialogueIds: () => eventDialogueIds()[FOCUS_ROOM_ENTRY_EVENT] ?? [],
    errorMessage,
    eventDialogueIds,
    getAudio: (audioKey) => getRepository().getAudio(audioKey),
    isDialoguePlaybackBlocked: playback.isBlocked,
    isDialogueScheduled: playback.isDialogueScheduled,
    isEntryPlaybackBlocked: playback.isBlocked,
    isLoading,
    onStopDialoguePlayback: playback.stop,
    onStopEntryPlayback: playback.stop,
    async playDialogue(dialogueId) {
      if (repository === null) {
        await initialization
      }

      if (!isDisposed && repository !== null) {
        await playback.prepare(repository, dialogueId)
      }
    },
    async playDialogueEvents(eventIds, onBeforePlayback) {
      if (repository === null) {
        await initialization
      }

      if (isDisposed || repository === null) {
        return
      }

      const bindings = eventDialogueIds()
      const dialogueIds = eventIds.flatMap((eventId) => bindings[eventId] ?? [])

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
      if (repository === null) {
        await initialization
      }

      if (!isDisposed && repository !== null) {
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
          persistedBindings = storedBindings
          setEventDialogueIds(storedBindings)
        }
      }
    },
    retryDialoguePlayback: playback.retry,
    retryEntryPlayback: playback.retry,
    setEntryDialogue: (dialogueId) =>
      setEventDialogues(FOCUS_ROOM_ENTRY_EVENT, dialogueId === null ? [] : [dialogueId]),
    setEntryDialogues: (dialogueIds) => setEventDialogues(FOCUS_ROOM_ENTRY_EVENT, dialogueIds),
    setEventDialogue: (eventId, dialogueId) =>
      setEventDialogues(eventId, dialogueId === null ? [] : [dialogueId]),
    setEventDialogues,
  }

  onMount(() => {
    initializeEvents().catch((error: unknown) => {
      console.error('Unexpected focus room event initialization failure.', error)
    })
  })

  onCleanup(() => {
    isDisposed = true
    resolveInitialization?.()
    playback.dispose()
    repository?.dispose()
  })

  return (
    <FocusRoomEventContext.Provider value={contextValue}>
      {props.children}
    </FocusRoomEventContext.Provider>
  )
}

export const useFocusRoomEvents = () => {
  const context = useContext(FocusRoomEventContext)

  if (context === undefined) {
    throw new Error('useFocusRoomEvents must be used inside FocusRoomEventProvider.')
  }

  return context
}
