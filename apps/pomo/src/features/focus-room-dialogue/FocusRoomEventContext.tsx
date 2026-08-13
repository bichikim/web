import {
  type Accessor,
  createContext,
  createSignal,
  type JSX,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js'

import type {FocusRoomDialogueRepository} from './repository'
import {type DialogueEventId, FOCUS_ROOM_ENTRY_EVENT, type FocusRoomDialogue} from './schema'
import {getDialoguePositionAtTime} from './timeline'

const MILLISECONDS_PER_SECOND = 1000

export interface FocusRoomEventContextValue {
  readonly activeSegmentCount: Accessor<number>
  readonly activeSegmentPosition: Accessor<number | null>
  readonly activeText: Accessor<string | null>
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dialogues: Accessor<ReadonlyArray<FocusRoomDialogue>>
  readonly eventDialogueIds: Accessor<Readonly<Partial<Record<DialogueEventId, string>>>>
  readonly errorMessage: Accessor<string | null>
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly isDialoguePlaybackBlocked: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly onStopDialoguePlayback: () => void
  readonly playDialogueEvents: (
    eventIds: ReadonlyArray<DialogueEventId>,
    onBeforePlayback?: () => void,
  ) => Promise<void>
  readonly retryDialoguePlayback: () => void
  readonly setEventDialogue: (eventId: DialogueEventId, dialogueId: string | null) => Promise<void>
}

export interface FocusRoomEventProviderProps {
  readonly children: JSX.Element
}

interface DialoguePlaybackController {
  readonly activeDialogueId: () => string | null
  readonly activeSegmentCount: Accessor<number>
  readonly activeSegmentPosition: Accessor<number | null>
  readonly activeText: Accessor<string | null>
  readonly dispose: () => void
  readonly isBlocked: Accessor<boolean>
  readonly prepare: (
    repository: FocusRoomDialogueRepository,
    dialogueIds: ReadonlyArray<string>,
  ) => Promise<void>
  readonly retry: () => void
  readonly stop: () => void
}

const FocusRoomEventContext = createContext<FocusRoomEventContextValue>()

const revokeAudioUrl = (audioUrl: string | null) => {
  if (audioUrl !== null) {
    URL.revokeObjectURL(audioUrl)
  }

  return null
}

const createDialoguePlaybackController = (): DialoguePlaybackController => {
  const [activeSegmentCount, setActiveSegmentCount] = createSignal(0)
  const [activeSegmentPosition, setActiveSegmentPosition] = createSignal<number | null>(null)
  const [activeText, setActiveText] = createSignal<string | null>(null)
  const [isBlocked, setIsBlocked] = createSignal(false)
  let animationFrame: number | null = null
  let audio: HTMLAudioElement | null = null
  let audioUrl: string | null = null
  let endedHandler: (() => void) | null = null
  let dialogue: FocusRoomDialogue | null = null
  let isAwaitingSceneInteraction = false
  let isDisposed = false
  let pendingDialogueIds: Array<string> = []
  let playbackRepository: FocusRoomDialogueRepository | null = null
  let playbackRequestId = 0
  const isPlaybackCancelled = (requestId: number) => isDisposed || requestId !== playbackRequestId

  const cancelFrame = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  const updateSubtitle = () => {
    if (audio === null || dialogue === null || audio.ended) {
      cancelFrame()
      return
    }

    const activePosition = getDialoguePositionAtTime(
      dialogue.segments,
      audio.currentTime * MILLISECONDS_PER_SECOND,
    )
    setActiveSegmentPosition(activePosition?.position ?? null)
    setActiveText(activePosition?.text ?? null)
    animationFrame = window.requestAnimationFrame(updateSubtitle)
  }

  const releaseActivePlayback = () => {
    cancelFrame()
    if (endedHandler !== null) {
      audio?.removeEventListener('ended', endedHandler)
      endedHandler = null
    }
    audio?.pause()
    audio = null
    dialogue = null
    isAwaitingSceneInteraction = false
    setIsBlocked(false)
    setActiveSegmentCount(0)
    setActiveSegmentPosition(null)
    setActiveText(null)

    audioUrl = revokeAudioUrl(audioUrl)
  }

  const stop = () => {
    playbackRequestId += 1
    pendingDialogueIds = []
    playbackRepository = null
    releaseActivePlayback()
  }

  const playNext = async (requestId: number): Promise<void> => {
    const currentRepository = playbackRepository
    const dialogueId = pendingDialogueIds.shift()

    if (currentRepository === null || dialogueId === undefined || isPlaybackCancelled(requestId)) {
      return
    }

    const storedDialogue = await currentRepository.getDialogue(dialogueId)

    if (isPlaybackCancelled(requestId)) {
      return
    }

    if (storedDialogue === null) {
      await playNext(requestId)
      return
    }

    const storedAudio = await currentRepository.getAudio(storedDialogue.audioKey)

    if (isPlaybackCancelled(requestId)) {
      return
    }

    if (storedAudio === null) {
      await playNext(requestId)
      return
    }

    dialogue = storedDialogue
    setActiveSegmentCount(storedDialogue.segments.length)
    audioUrl = URL.createObjectURL(storedAudio)
    audio = new Audio(audioUrl)
    endedHandler = () => {
      releaseActivePlayback()
      playNext(requestId).catch((error: unknown) => {
        console.error('Unexpected focus room dialogue playback failure.', error)
        stop()
      })
    }
    audio.addEventListener('ended', endedHandler, {once: true})
    await start()
  }

  const start = async () => {
    const currentAudio = audio

    if (currentAudio === null || isDisposed) {
      return
    }

    try {
      await currentAudio.play()

      if (audio !== currentAudio || isDisposed) {
        return
      }

      isAwaitingSceneInteraction = false
      setIsBlocked(false)
      cancelFrame()
      updateSubtitle()
    } catch (error: unknown) {
      if (audio !== currentAudio || isDisposed) {
        return
      }

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        isAwaitingSceneInteraction = true
        setIsBlocked(true)
        return
      }

      console.error('Failed to play focus room dialogue.', error)
      stop()
    }
  }

  return {
    activeDialogueId: () => dialogue?.id ?? null,
    activeSegmentCount,
    activeSegmentPosition,
    activeText,
    dispose() {
      isDisposed = true
      stop()
    },
    isBlocked,
    async prepare(repository, dialogueIds) {
      stop()
      const currentRequestId = playbackRequestId
      playbackRepository = repository
      pendingDialogueIds = [...dialogueIds]
      await playNext(currentRequestId)
    },
    retry() {
      if (!isAwaitingSceneInteraction) {
        return
      }

      start().catch((error: unknown) => {
        console.error('Unexpected focus room dialogue playback failure.', error)
      })
    },
    stop,
  }
}

export const FocusRoomEventProvider = (props: FocusRoomEventProviderProps) => {
  const playback = createDialoguePlaybackController()
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FocusRoomDialogue>>([])
  const [eventDialogueIds, setEventDialogueIds] = createSignal<
    Readonly<Partial<Record<DialogueEventId, string>>>
  >({})
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  let repository: FocusRoomDialogueRepository | null = null
  let isDisposed = false
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

      setDialogues(storedDialogues)
      setEventDialogueIds(
        Object.fromEntries(eventBindings.map((binding) => [binding.event, binding.dialogueId])),
      )
      setErrorMessage(null)

      const entryBinding = eventBindings.find((binding) => binding.event === FOCUS_ROOM_ENTRY_EVENT)
      if (entryBinding !== undefined) {
        await playback.prepare(currentRepository, [entryBinding.dialogueId])
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

  const contextValue: FocusRoomEventContextValue = {
    activeSegmentCount: playback.activeSegmentCount,
    activeSegmentPosition: playback.activeSegmentPosition,
    activeText: playback.activeText,
    async deleteDialogue(dialogueId) {
      await getRepository().deleteDialogue(dialogueId)

      if (isDisposed) {
        return
      }

      setDialogues((currentDialogues) =>
        currentDialogues.filter((dialogue) => dialogue.id !== dialogueId),
      )

      setEventDialogueIds((currentBindings) =>
        Object.fromEntries(
          Object.entries(currentBindings).filter(([, currentId]) => currentId !== dialogueId),
        ),
      )

      if (playback.activeDialogueId() === dialogueId) {
        playback.stop()
      }
    },
    dialogues,
    errorMessage,
    eventDialogueIds,
    getAudio: (audioKey) => getRepository().getAudio(audioKey),
    isDialoguePlaybackBlocked: playback.isBlocked,
    isLoading,
    onStopDialoguePlayback: playback.stop,
    async playDialogueEvents(eventIds, onBeforePlayback) {
      await initialization

      if (isDisposed || repository === null) {
        return
      }

      const bindings = eventDialogueIds()
      const dialogueIds = eventIds.flatMap((eventId) => {
        const dialogueId = bindings[eventId]
        return dialogueId === undefined ? [] : [dialogueId]
      })

      if (dialogueIds.length > 0) {
        onBeforePlayback?.()
        await playback.prepare(getRepository(), dialogueIds)
      }
    },
    retryDialoguePlayback: playback.retry,
    async setEventDialogue(eventId, dialogueId) {
      await getRepository().setEventBinding(eventId, dialogueId)

      if (isDisposed) {
        return
      }

      setEventDialogueIds((currentBindings) => {
        if (dialogueId === null) {
          const nextBindings = {...currentBindings}
          delete nextBindings[eventId]
          return nextBindings
        }

        return {...currentBindings, [eventId]: dialogueId}
      })
    },
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
