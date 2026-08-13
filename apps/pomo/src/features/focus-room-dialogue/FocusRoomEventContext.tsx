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
import type {FocusRoomDialogue} from './schema'

export type {PlayFocusRoomDialogueSequenceOptions} from './entry-playback-controller'

export interface FocusRoomEventContextValue {
  readonly activeDialogueId: Accessor<string | null>
  readonly activeText: Accessor<string | null>
  readonly deleteDialogue: (dialogueId: string) => Promise<void>
  readonly dialogues: Accessor<ReadonlyArray<FocusRoomDialogue>>
  readonly entryDialogueId: Accessor<string | null>
  readonly entryDialogueIds: Accessor<ReadonlyArray<string>>
  readonly errorMessage: Accessor<string | null>
  readonly getAudio: (audioKey: string) => Promise<Blob | null>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
  readonly isEntryPlaybackBlocked: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly onStopEntryPlayback: () => void
  readonly playDialogue: (dialogueId: string) => Promise<void>
  readonly playDialogueSequence: (options: PlayFocusRoomDialogueSequenceOptions) => Promise<void>
  readonly refreshDialogues: () => Promise<void>
  readonly retryEntryPlayback: () => void
  readonly setEntryDialogue: (dialogueId: string | null) => Promise<void>
  readonly setEntryDialogues: (dialogueIds: ReadonlyArray<string>) => Promise<void>
}

export interface FocusRoomEventProviderProps {
  readonly children: JSX.Element
}

const FocusRoomEventContext = createContext<FocusRoomEventContextValue>()

export const FocusRoomEventProvider = (props: FocusRoomEventProviderProps) => {
  const playback = createEntryPlaybackController()
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FocusRoomDialogue>>([])
  const [entryDialogueIds, setEntryDialogueIds] = createSignal<ReadonlyArray<string>>([])
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  let repository: FocusRoomDialogueRepository | null = null
  let isDisposed = false
  let entryBindingUpdate = Promise.resolve()
  let entryBindingRevision = 0
  let persistedEntryIds: ReadonlyArray<string> = []

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
      const storedEntryDialogueIds = entryBinding?.dialogueIds ?? []
      persistedEntryIds = storedEntryDialogueIds
      setEntryDialogueIds(storedEntryDialogueIds)
      setErrorMessage(null)

      if (storedEntryDialogueIds.length > 0) {
        playback
          .playSequence(currentRepository, {
            dialogueIds: storedEntryDialogueIds,
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
    }
  }

  const contextValue: FocusRoomEventContextValue = {
    activeDialogueId: playback.activeDialogueId,
    activeText: playback.activeText,
    async deleteDialogue(dialogueId) {
      await entryBindingUpdate.catch(() => undefined)
      await getRepository().deleteDialogue(dialogueId)

      if (isDisposed) {
        return
      }

      setDialogues((currentDialogues) =>
        currentDialogues.filter((dialogue) => dialogue.id !== dialogueId),
      )

      const remainingEntryIds = entryDialogueIds().filter((id) => id !== dialogueId)
      entryBindingRevision += 1
      persistedEntryIds = remainingEntryIds
      setEntryDialogueIds(remainingEntryIds)

      if (playback.activeDialogueId() === dialogueId) {
        playback.cancel()
      }
    },
    dialogues,
    entryDialogueId: () => entryDialogueIds()[0] ?? null,
    entryDialogueIds,
    errorMessage,
    getAudio: (audioKey) => getRepository().getAudio(audioKey),
    isDialogueScheduled: playback.isDialogueScheduled,
    isEntryPlaybackBlocked: playback.isBlocked,
    isLoading,
    onStopEntryPlayback: playback.stop,
    playDialogue: (dialogueId) => playback.prepare(getRepository(), dialogueId),
    playDialogueSequence: (options) => playback.playSequence(getRepository(), options),
    async refreshDialogues() {
      await entryBindingUpdate.catch(() => undefined)
      const refreshRevision = entryBindingRevision
      const currentRepository = getRepository()
      const [storedDialogues, entryBinding] = await Promise.all([
        currentRepository.listDialogues(),
        currentRepository.getEntryBinding(),
      ])

      if (!isDisposed) {
        setDialogues(storedDialogues)

        if (refreshRevision === entryBindingRevision) {
          const storedEntryDialogueIds = entryBinding?.dialogueIds ?? []
          persistedEntryIds = storedEntryDialogueIds
          setEntryDialogueIds(storedEntryDialogueIds)
        }
      }
    },
    retryEntryPlayback: playback.retry,
    setEntryDialogue: (dialogueId) =>
      contextValue.setEntryDialogues(dialogueId === null ? [] : [dialogueId]),
    async setEntryDialogues(dialogueIds) {
      const uniqueDialogueIds = [...new Set(dialogueIds)]
      entryBindingRevision += 1
      const currentRevision = entryBindingRevision
      setEntryDialogueIds(uniqueDialogueIds)
      const update = entryBindingUpdate
        .catch(() => undefined)
        .then(() => getRepository().setEntryBinding(uniqueDialogueIds))
      entryBindingUpdate = update

      try {
        await update
        persistedEntryIds = uniqueDialogueIds
      } catch (error: unknown) {
        if (!isDisposed && currentRevision === entryBindingRevision) {
          setEntryDialogueIds(persistedEntryIds)
        }

        throw error
      }
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
