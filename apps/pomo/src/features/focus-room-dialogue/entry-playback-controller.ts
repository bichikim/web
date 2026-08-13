// oxlint-disable eslint/no-await-in-loop -- Dialogue audio must finish before the next queued item starts.
import {type Accessor, createSignal} from 'solid-js'

import type {FocusRoomDialogueRepository} from './repository'
import type {FocusRoomDialogue} from './schema'
import {getDialogueTextAtTime} from './timeline'

const MILLISECONDS_PER_SECOND = 1000

export interface PlayFocusRoomDialogueSequenceOptions {
  readonly dialogueIds: ReadonlyArray<string>
  readonly onDialogueStart: (dialogueId: string) => Promise<void> | void
  readonly onSequenceStop: (dialogueIds: ReadonlyArray<string>) => Promise<void> | void
}

export interface EntryPlaybackController {
  readonly activeDialogueId: () => string | null
  readonly activeText: Accessor<string | null>
  readonly cancel: () => void
  readonly dispose: () => void
  readonly isBlocked: Accessor<boolean>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
  readonly prepare: (repository: FocusRoomDialogueRepository, dialogueId: string) => Promise<void>
  readonly playSequence: (
    repository: FocusRoomDialogueRepository,
    options: PlayFocusRoomDialogueSequenceOptions,
  ) => Promise<void>
  readonly retry: () => void
  readonly stop: () => void
}

type PlaybackCompletion = 'cancelled' | 'ended' | 'failed' | 'missing' | 'stopped'

interface PlaybackQueueRequest {
  readonly dialogueIds: ReadonlyArray<string>
  readonly onDialogueStart: PlayFocusRoomDialogueSequenceOptions['onDialogueStart']
  readonly onSequenceStop: PlayFocusRoomDialogueSequenceOptions['onSequenceStop']
  readonly reject: (error: unknown) => void
  readonly repository: FocusRoomDialogueRepository
  readonly resolve: () => void
  settled: boolean
}

const settleQueueRequest = async (request: PlaybackQueueRequest, notifyStop: boolean) => {
  if (request.settled) {
    return
  }

  request.settled = true

  try {
    if (notifyStop) {
      await request.onSequenceStop(request.dialogueIds)
    }

    request.resolve()
  } catch (error: unknown) {
    request.reject(error)
  }
}

const failQueueRequest = (request: PlaybackQueueRequest, error: unknown) => {
  if (request.settled) {
    return
  }

  request.settled = true
  request.reject(error)
}

/** Owns one audio element and serializes event and feed dialogue requests. */
// oxlint-disable-next-line eslint/max-lines-per-function -- One controller owns the audio element, queue, retry, and disposal lifecycle.
export const createEntryPlaybackController = (): EntryPlaybackController => {
  const [activeText, setActiveText] = createSignal<string | null>(null)
  const [isBlocked, setIsBlocked] = createSignal(false)
  let animationFrame: number | null = null
  let audio: HTMLAudioElement | null = null
  let audioUrl: string | null = null
  let dialogue: FocusRoomDialogue | null = null
  let activeRequest: PlaybackQueueRequest | null = null
  let isDraining = false
  let isAwaitingSceneInteraction = false
  let isDisposed = false
  let playbackGeneration = 0
  let resolveCompletion: ((completion: PlaybackCompletion) => void) | null = null
  const requestQueue: Array<PlaybackQueueRequest> = []

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

  const settleCompletion = (completion: PlaybackCompletion) => {
    const resolve = resolveCompletion
    resolveCompletion = null
    resolve?.(completion)
  }

  const clearPlayback = () => {
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

  const finishPlayback = (completion: PlaybackCompletion) => {
    settleCompletion(completion)
    clearPlayback()
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

      console.error('Failed to play focus room entry dialogue.', error)
      finishPlayback('failed')
    }
  }

  const loadDialogue = async (
    repository: FocusRoomDialogueRepository,
    dialogueId: string,
    generation: number,
  ) => {
    const storedDialogue = await repository.getDialogue(dialogueId)

    if (storedDialogue === null || isDisposed || generation !== playbackGeneration) {
      return null
    }

    const storedAudio = await repository.getAudio(storedDialogue.audioKey)

    if (storedAudio === null || isDisposed || generation !== playbackGeneration) {
      return null
    }

    dialogue = storedDialogue
    audioUrl = URL.createObjectURL(storedAudio)
    audio = new Audio(audioUrl)
    return audio
  }

  const playSequenceItem = async (
    repository: FocusRoomDialogueRepository,
    dialogueId: string,
    generation: number,
    onDialogueStart: PlayFocusRoomDialogueSequenceOptions['onDialogueStart'],
  ): Promise<PlaybackCompletion> => {
    const currentAudio = await loadDialogue(repository, dialogueId, generation)

    if (currentAudio === null) {
      return generation === playbackGeneration ? 'missing' : 'cancelled'
    }

    try {
      await onDialogueStart(dialogueId)
    } catch (error: unknown) {
      clearPlayback()
      throw error
    }

    if (isDisposed || generation !== playbackGeneration) {
      clearPlayback()
      return 'cancelled'
    }

    const completion = new Promise<PlaybackCompletion>((resolve) => {
      resolveCompletion = resolve
    })
    currentAudio.addEventListener(
      'ended',
      () => {
        if (audio !== currentAudio) {
          return
        }

        settleCompletion('ended')
        clearPlayback()
      },
      {once: true},
    )
    await start()
    return completion
  }

  const playRequest = async (
    request: PlaybackQueueRequest,
    generation: number,
  ): Promise<PlaybackCompletion> => {
    for (const dialogueId of request.dialogueIds) {
      if (isDisposed || generation !== playbackGeneration) {
        return 'cancelled'
      }

      const completion = await playSequenceItem(
        request.repository,
        dialogueId,
        generation,
        request.onDialogueStart,
      )

      switch (completion) {
        case 'ended':
        case 'missing':
          break
        case 'cancelled':
        case 'failed':
        case 'stopped':
          return completion
        default: {
          const exhaustiveCompletion: never = completion
          return exhaustiveCompletion
        }
      }
    }

    return 'ended'
  }

  const processQueueRequest = async (request: PlaybackQueueRequest) => {
    activeRequest = request
    const generation = playbackGeneration

    try {
      const completion = await playRequest(request, generation)

      if (completion === 'ended' || completion === 'failed') {
        await settleQueueRequest(request, false)
      }
    } catch (error: unknown) {
      clearPlayback()
      failQueueRequest(request, error)
    }

    if (activeRequest === request) {
      activeRequest = null
    }
  }

  const drainQueue = async () => {
    if (isDraining || isDisposed) {
      return
    }

    isDraining = true

    try {
      while (requestQueue.length > 0) {
        if (isDisposed) {
          return
        }

        const request = requestQueue.shift()

        if (request === undefined) {
          return
        }

        await processQueueRequest(request)
      }
    } finally {
      isDraining = false

      if (!isDisposed && requestQueue.length > 0) {
        drainQueue().catch((error: unknown) => {
          console.error('Unexpected dialogue queue failure.', error)
        })
      }
    }
  }

  const enqueue = (
    repository: FocusRoomDialogueRepository,
    options: PlayFocusRoomDialogueSequenceOptions,
  ) =>
    new Promise<void>((resolve, reject) => {
      requestQueue.push({
        dialogueIds: [...options.dialogueIds],
        onDialogueStart: options.onDialogueStart,
        onSequenceStop: options.onSequenceStop,
        reject,
        repository,
        resolve,
        settled: false,
      })
      drainQueue().catch((error: unknown) => {
        console.error('Unexpected dialogue queue failure.', error)
      })
    })

  const finishQueue = (notifyStop: boolean) => {
    playbackGeneration += 1
    const completion = notifyStop ? 'stopped' : 'cancelled'
    const requests = activeRequest === null ? [...requestQueue] : [activeRequest, ...requestQueue]
    requestQueue.length = 0
    activeRequest = null
    finishPlayback(completion)
    requests.forEach((request) => {
      settleQueueRequest(request, notifyStop).catch((error: unknown) => {
        console.error('Unexpected dialogue request settlement failure.', error)
      })
    })
  }

  const cancel = () => finishQueue(false)
  const stop = () => finishQueue(true)

  return {
    activeDialogueId: () => dialogue?.id ?? null,
    activeText,
    cancel,
    dispose() {
      isDisposed = true
      cancel()
    },
    isBlocked,
    isDialogueScheduled: (dialogueId) =>
      dialogue?.id === dialogueId ||
      activeRequest?.dialogueIds.includes(dialogueId) === true ||
      requestQueue.some((request) => request.dialogueIds.includes(dialogueId)),
    playSequence: enqueue,
    prepare: (repository, dialogueId) =>
      enqueue(repository, {
        dialogueIds: [dialogueId],
        onDialogueStart: () => undefined,
        onSequenceStop: () => undefined,
      }),
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
