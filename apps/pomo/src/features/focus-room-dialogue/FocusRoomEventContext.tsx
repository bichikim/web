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
import type {FocusRoomDialogue} from './schema'
import {getDialogueTextAtTime} from './timeline'

const MILLISECONDS_PER_SECOND = 1000

export interface FocusRoomEventContextValue {
  readonly activeText: Accessor<string | null>
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dialogues: Accessor<ReadonlyArray<FocusRoomDialogue>>
  readonly entryDialogueId: Accessor<string | null>
  readonly errorMessage: Accessor<string | null>
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly isEntryPlaybackBlocked: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly onStopEntryPlayback: () => void
  readonly retryEntryPlayback: () => void
  readonly setEntryDialogue: (dialogueId: string | null) => Promise<void>
}

export interface FocusRoomEventProviderProps {
  readonly children: JSX.Element
}

interface EntryPlaybackController {
  readonly activeDialogueId: () => string | null
  readonly activeText: Accessor<string | null>
  readonly dispose: () => void
  readonly isBlocked: Accessor<boolean>
  readonly prepare: (repository: FocusRoomDialogueRepository, dialogueId: string) => Promise<void>
  readonly retry: () => void
  readonly stop: () => void
}

const FocusRoomEventContext = createContext<FocusRoomEventContextValue>()

const createEntryPlaybackController = (): EntryPlaybackController => {
  const [activeText, setActiveText] = createSignal<string | null>(null)
  const [isBlocked, setIsBlocked] = createSignal(false)
  let animationFrame: number | null = null
  let audio: HTMLAudioElement | null = null
  let audioUrl: string | null = null
  let dialogue: FocusRoomDialogue | null = null
  let isAwaitingSceneInteraction = false
  let isDisposed = false

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

    setActiveText(
      getDialogueTextAtTime(dialogue.segments, audio.currentTime * MILLISECONDS_PER_SECOND),
    )
    animationFrame = window.requestAnimationFrame(updateSubtitle)
  }

  const stop = () => {
    cancelFrame()
    audio?.pause()
    audio = null
    dialogue = null
    isAwaitingSceneInteraction = false
    setIsBlocked(false)
    setActiveText(null)

    if (audioUrl !== null) {
      URL.revokeObjectURL(audioUrl)
      audioUrl = null
    }
  }

  const start = async () => {
    if (audio === null || isDisposed) {
      return
    }

    try {
      await audio.play()
      isAwaitingSceneInteraction = false
      setIsBlocked(false)
      cancelFrame()
      updateSubtitle()
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        isAwaitingSceneInteraction = true
        setIsBlocked(true)
        return
      }

      console.error('Failed to play focus room entry dialogue.', error)
    }
  }

  return {
    activeDialogueId: () => dialogue?.id ?? null,
    activeText,
    dispose() {
      isDisposed = true
      stop()
    },
    isBlocked,
    async prepare(repository, dialogueId) {
      const storedDialogue = await repository.getDialogue(dialogueId)

      if (storedDialogue === null || isDisposed) {
        return
      }

      const storedAudio = await repository.getAudio(storedDialogue.audioKey)

      if (storedAudio === null || isDisposed) {
        return
      }

      dialogue = storedDialogue
      audioUrl = URL.createObjectURL(storedAudio)
      audio = new Audio(audioUrl)
      audio.addEventListener('ended', stop, {once: true})
      await start()
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
  const playback = createEntryPlaybackController()
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FocusRoomDialogue>>([])
  const [entryDialogueId, setEntryDialogueId] = createSignal<string | null>(null)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  let repository: FocusRoomDialogueRepository | null = null
  let isDisposed = false

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
      const [storedDialogues, entryBinding] = await Promise.all([
        currentRepository.listDialogues(),
        currentRepository.getEntryBinding(),
      ])

      if (isDisposed) {
        return
      }

      setDialogues(storedDialogues)
      setEntryDialogueId(entryBinding?.dialogueId ?? null)
      setErrorMessage(null)

      if (entryBinding !== null) {
        await playback.prepare(currentRepository, entryBinding.dialogueId)
      }
    } catch (error: unknown) {
      console.error('Failed to initialize focus room events.', error)
      setErrorMessage('이벤트와 저장된 대화를 불러오지 못했어요.')
    } finally {
      if (!isDisposed) {
        setIsLoading(false)
      }
    }
  }

  const contextValue: FocusRoomEventContextValue = {
    activeText: playback.activeText,
    async deleteDialogue(dialogueId) {
      await getRepository().deleteDialogue(dialogueId)
      setDialogues((currentDialogues) =>
        currentDialogues.filter((dialogue) => dialogue.id !== dialogueId),
      )

      if (entryDialogueId() === dialogueId) {
        setEntryDialogueId(null)
      }

      if (playback.activeDialogueId() === dialogueId) {
        playback.stop()
      }
    },
    dialogues,
    entryDialogueId,
    errorMessage,
    getAudio: (audioKey) => getRepository().getAudio(audioKey),
    isEntryPlaybackBlocked: playback.isBlocked,
    isLoading,
    onStopEntryPlayback: playback.stop,
    retryEntryPlayback: playback.retry,
    async setEntryDialogue(dialogueId) {
      await getRepository().setEntryBinding(dialogueId)
      setEntryDialogueId(dialogueId)
    },
  }

  onMount(() => {
    initializeEvents().catch((error: unknown) => {
      console.error('Unexpected focus room event initialization failure.', error)
    })
  })

  onCleanup(() => {
    isDisposed = true
    playback.dispose()
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
