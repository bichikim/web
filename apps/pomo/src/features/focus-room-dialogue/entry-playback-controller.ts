// oxlint-disable eslint/no-await-in-loop -- Dialogue audio must finish before the next queued item starts.
import {type Accessor, createSignal} from 'solid-js'

import {
  createPVisemeDriver,
  createPWaveEnvelope,
  getPAudioEnvelopeLevel,
  type PAudioEnvelope,
  type PViseme,
} from '../lip-sync'
import {
  createPBrowserAudioVisemeAnalyzer,
  type PBrowserAudioVisemeAnalyzer,
} from '../lip-sync/browser-audio-viseme'
import {createPSilentMouthReturn} from '../lip-sync/silent-mouth-return'
import type {PDialogueRepository} from './repository'
import type {DialogueSegmentMood, PDialogue} from './schema'
import {getDialoguePositionAtTime, getDialogueVisemeAtTime} from './timeline'

const MILLISECONDS_PER_SECOND = 1000

type VisemeResetTiming = 'delayed' | 'immediate'

const readAudioEnvelope = async (audioBlob: Blob) => {
  try {
    if (typeof audioBlob.arrayBuffer === 'function') {
      return createPWaveEnvelope(await audioBlob.arrayBuffer())
    }

    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result)
        } else {
          reject(new Error('Dialogue audio could not be read as an ArrayBuffer.'))
        }
      })
      reader.addEventListener('error', () => reject(reader.error))
      reader.readAsArrayBuffer(audioBlob)
    })
    return createPWaveEnvelope(buffer)
  } catch {
    return null
  }
}

export interface PlayPDialogueSequenceOptions {
  readonly dialogueIds: ReadonlyArray<string>
  readonly onDialogueStart: (dialogueId: string) => Promise<void> | void
  readonly onDialogueUnavailable?: (dialogueId: string) => Promise<void> | void
  readonly onSequenceStop: (dialogueIds: ReadonlyArray<string>) => Promise<void> | void
}

export interface EntryPlaybackController {
  readonly activeDialogueId: () => string | null
  readonly activeSegmentCount: Accessor<number>
  readonly activeSegmentMood: Accessor<DialogueSegmentMood | null>
  readonly activeSegmentPosition: Accessor<number | null>
  readonly activeText: Accessor<string | null>
  readonly activeViseme: Accessor<PViseme>
  readonly cancel: () => void
  readonly dispose: () => void
  readonly isBlocked: Accessor<boolean>
  readonly isDialogueScheduled: (dialogueId: string) => boolean
  readonly isPlaying: Accessor<boolean>
  readonly prepare: (repository: PDialogueRepository, dialogueId: string) => Promise<void>
  readonly playSequence: (
    repository: PDialogueRepository,
    options: PlayPDialogueSequenceOptions,
  ) => Promise<void>
  readonly retry: () => void
  readonly scheduledDialogueCount: Accessor<number>
  readonly skip: () => void
  readonly stop: () => void
}

type PlaybackCompletion = 'cancelled' | 'ended' | 'failed' | 'missing' | 'stopped'

interface PlaySequenceItemOptions {
  readonly dialogueId: string
  readonly generation: number
  readonly onDialogueStart: PlayPDialogueSequenceOptions['onDialogueStart']
  readonly onDialogueUnavailable: PlayPDialogueSequenceOptions['onDialogueUnavailable']
  readonly repository: PDialogueRepository
}

interface PlaybackQueueRequest {
  readonly dialogueIds: ReadonlyArray<string>
  readonly onDialogueStart: PlayPDialogueSequenceOptions['onDialogueStart']
  readonly onDialogueUnavailable: PlayPDialogueSequenceOptions['onDialogueUnavailable']
  readonly onSequenceStop: PlayPDialogueSequenceOptions['onSequenceStop']
  readonly reject: (error: unknown) => void
  readonly repository: PDialogueRepository
  readonly resolve: () => void
  nextDialoguePosition: number
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
// oxlint-disable-next-line eslint/max-lines-per-function, eslint/max-statements -- One controller owns the audio element, queue, retry, and disposal lifecycle.
export const createEntryPlaybackController = (): EntryPlaybackController => {
  const [activeSegmentCount, setActiveSegmentCount] = createSignal(0)
  const [activeSegmentMood, setActiveSegmentMood] = createSignal<DialogueSegmentMood | null>(null)
  const [activeSegmentPosition, setActiveSegmentPosition] = createSignal<number | null>(null)
  const [activeText, setActiveText] = createSignal<string | null>(null)
  const [activeViseme, setActiveViseme] = createSignal<PViseme>('rest')
  const [isBlocked, setIsBlocked] = createSignal(false)
  const [isPlaying, setIsPlaying] = createSignal(false)
  const [scheduledDialogueCount, setScheduledDialogueCount] = createSignal(0)
  const visemeDriver = createPVisemeDriver()
  const silentMouthReturn = createPSilentMouthReturn(() => setActiveViseme('closed'))
  let animationFrame: number | null = null
  let audio: HTMLAudioElement | null = null
  let audioContext: AudioContext | null = null
  let audioContextSuspension: Promise<void> | null = null
  let audioEnvelope: PAudioEnvelope | null = null
  let audioSource: MediaElementAudioSourceNode | null = null
  let audioUrl: string | null = null
  let audioVisemeAnalyzer: PBrowserAudioVisemeAnalyzer | null = null
  let dialogue: PDialogue | null = null
  let activeRequest: PlaybackQueueRequest | null = null
  let isDraining = false
  let isAwaitingSceneInteraction = false
  let isDisposed = false
  let playbackGeneration = 0
  let resolveCompletion: ((completion: PlaybackCompletion) => void) | null = null
  const requestQueue: Array<PlaybackQueueRequest> = []
  const reportPlaybackFailure = console.error.bind(
    console,
    'Unexpected focus room dialogue playback failure.',
  )
  const reportQueueFailure = console.error.bind(console, 'Unexpected dialogue queue failure.')
  const reportSettlementFailure = console.error.bind(
    console,
    'Unexpected dialogue request settlement failure.',
  )

  const updateScheduledDialogueCount = () => {
    const activeCount =
      activeRequest === null
        ? 0
        : activeRequest.dialogueIds.length - activeRequest.nextDialoguePosition
    const queuedCount = requestQueue.reduce(
      (count, request) => count + request.dialogueIds.length,
      0,
    )

    setScheduledDialogueCount(activeCount + queuedCount)
  }

  const cancelFrame = () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
  }

  const resetViseme = (timing: VisemeResetTiming) => {
    silentMouthReturn.cancel()

    if (timing === 'immediate') {
      setActiveViseme('closed')
      return
    }

    silentMouthReturn.schedule()
  }

  const updateSubtitle = () => {
    if (audio === null || dialogue === null || audio.ended) {
      cancelFrame()
      return
    }

    const currentTimeMs = audio.currentTime * MILLISECONDS_PER_SECOND
    const activePosition = getDialoguePositionAtTime(dialogue.segments, currentTimeMs)
    const activeSegment =
      activePosition === null ? undefined : dialogue.segments[activePosition.position]
    setActiveSegmentMood(activeSegment?.mood ?? null)
    setActiveSegmentPosition(activePosition?.position ?? null)
    setActiveText(activePosition?.text ?? null)
    const targetViseme = getDialogueVisemeAtTime(dialogue.segments, currentTimeMs)
    const audioFrame = audioVisemeAnalyzer?.getFrame(targetViseme) ?? null
    const nextViseme = visemeDriver.update({
      currentTimeMs,
      intensity:
        audioFrame?.intensity ??
        (audioEnvelope === null ? 1 : getPAudioEnvelopeLevel(audioEnvelope, currentTimeMs)),
      viseme: audioFrame?.viseme ?? targetViseme,
    })

    if (nextViseme === 'rest') {
      silentMouthReturn.schedule()
    } else {
      silentMouthReturn.cancel()
      setActiveViseme(nextViseme)
    }
    animationFrame = window.requestAnimationFrame(updateSubtitle)
  }

  const settleCompletion = (completion: PlaybackCompletion) => {
    const resolve = resolveCompletion
    resolveCompletion = null
    resolve?.(completion)
  }

  const suspendAudioContext = () => {
    const context = audioContext

    if (context === null || context.state === 'closed') {
      return
    }

    audioContextSuspension = context.suspend().catch(() => undefined)
  }

  const clearPlayback = (visemeResetTiming: VisemeResetTiming = 'immediate') => {
    cancelFrame()
    audio?.pause()
    if (audioSource !== null) {
      audioVisemeAnalyzer?.disconnect(audioSource)
      audioSource.disconnect()
    }

    audioSource = null
    suspendAudioContext()
    audio = null
    audioEnvelope = null
    visemeDriver.reset()
    dialogue = null
    isAwaitingSceneInteraction = false
    setIsBlocked(false)
    setIsPlaying(false)
    setActiveSegmentCount(0)
    setActiveSegmentMood(null)
    setActiveSegmentPosition(null)
    setActiveText(null)
    resetViseme(visemeResetTiming)

    if (audioUrl !== null) {
      URL.revokeObjectURL(audioUrl)
      audioUrl = null
    }
  }

  const finishPlayback = (completion: PlaybackCompletion) => {
    settleCompletion(completion)
    clearPlayback(completion === 'ended' ? 'delayed' : 'immediate')
  }

  const start = async (currentAudio: HTMLAudioElement) => {
    try {
      const suspension = audioContextSuspension

      if (suspension !== null) {
        await suspension
      }

      if (audio !== currentAudio || isDisposed) {
        return
      }

      await audioContext?.resume()
      await currentAudio.play()

      if (audio !== currentAudio || isDisposed) {
        return
      }

      isAwaitingSceneInteraction = false
      setIsBlocked(false)
      setIsPlaying(true)
      silentMouthReturn.cancel()
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
    repository: PDialogueRepository,
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

    const storedAudioEnvelope = await readAudioEnvelope(storedAudio)

    if (isDisposed || generation !== playbackGeneration) {
      return null
    }

    dialogue = storedDialogue
    audioEnvelope = storedAudioEnvelope
    setActiveSegmentCount(storedDialogue.segments.length)
    audioUrl = URL.createObjectURL(storedAudio)
    audio = new Audio(audioUrl)

    if (typeof AudioContext !== 'undefined') {
      audioContext ??= new AudioContext()
      audioVisemeAnalyzer ??= createPBrowserAudioVisemeAnalyzer(audioContext)
      audioSource = audioContext.createMediaElementSource(audio)
      audioSource.connect(audioContext.destination)
      await audioVisemeAnalyzer.connect(audioSource)
    }

    return audio
  }

  const playSequenceItem = async (
    options: PlaySequenceItemOptions,
  ): Promise<PlaybackCompletion> => {
    const currentAudio = await loadDialogue(
      options.repository,
      options.dialogueId,
      options.generation,
    )

    if (currentAudio === null) {
      if (isDisposed || options.generation !== playbackGeneration) {
        return 'cancelled'
      }

      await options.onDialogueUnavailable?.(options.dialogueId)
      return 'missing'
    }

    try {
      await options.onDialogueStart(options.dialogueId)
    } catch (error: unknown) {
      clearPlayback()
      throw error
    }

    if (isDisposed || options.generation !== playbackGeneration) {
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
        clearPlayback('delayed')
      },
      {once: true},
    )
    currentAudio.addEventListener(
      'error',
      () => {
        if (audio !== currentAudio) {
          return
        }

        settleCompletion('failed')
        clearPlayback()
      },
      {once: true},
    )
    await start(currentAudio)
    return completion
  }

  const playRequest = async (
    request: PlaybackQueueRequest,
    generation: number,
  ): Promise<PlaybackCompletion> => {
    for (const [position, dialogueId] of request.dialogueIds.entries()) {
      if (isDisposed || generation !== playbackGeneration) {
        return 'cancelled'
      }

      request.nextDialoguePosition = position
      updateScheduledDialogueCount()
      const completion = await playSequenceItem({
        dialogueId,
        generation,
        onDialogueStart: request.onDialogueStart,
        onDialogueUnavailable: request.onDialogueUnavailable,
        repository: request.repository,
      })

      switch (completion) {
        case 'ended':
        case 'missing':
          request.nextDialoguePosition = position + 1
          updateScheduledDialogueCount()
          break
        case 'cancelled':
        case 'failed':
        case 'stopped':
          return completion
      }
    }

    return 'ended'
  }

  const processQueueRequest = async (request: PlaybackQueueRequest) => {
    activeRequest = request
    updateScheduledDialogueCount()
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
      updateScheduledDialogueCount()
    }
  }

  const drainQueue = async () => {
    if (isDraining || isDisposed) {
      return
    }

    isDraining = true

    try {
      while (requestQueue.length > 0) {
        const request = requestQueue.shift()!

        await processQueueRequest(request)
      }
    } finally {
      isDraining = false
      if (!isDisposed && activeViseme() !== 'closed') {
        resetViseme('delayed')
      }
    }
  }

  const enqueue = (repository: PDialogueRepository, options: PlayPDialogueSequenceOptions) =>
    new Promise<void>((resolve, reject) => {
      requestQueue.push({
        dialogueIds: [...options.dialogueIds],
        nextDialoguePosition: 0,
        onDialogueStart: options.onDialogueStart,
        onDialogueUnavailable: options.onDialogueUnavailable,
        onSequenceStop: options.onSequenceStop,
        reject,
        repository,
        resolve,
        settled: false,
      })
      updateScheduledDialogueCount()
      drainQueue().catch(reportQueueFailure)
    })

  const finishQueue = (notifyStop: boolean) => {
    playbackGeneration += 1
    const completion = notifyStop ? 'stopped' : 'cancelled'
    const requests = activeRequest === null ? [...requestQueue] : [activeRequest, ...requestQueue]
    requestQueue.length = 0
    activeRequest = null
    updateScheduledDialogueCount()
    finishPlayback(completion)
    requests.forEach((request) => {
      settleQueueRequest(request, notifyStop).catch(reportSettlementFailure)
    })
  }

  const cancel = () => finishQueue(false)
  const skip = () => {
    if (audio === null || isDisposed) {
      return
    }

    finishPlayback('ended')
  }
  const stop = () => finishQueue(true)

  return {
    activeDialogueId: () => dialogue?.id ?? null,
    activeSegmentCount,
    activeSegmentMood,
    activeSegmentPosition,
    activeText,
    activeViseme,
    cancel,
    dispose() {
      isDisposed = true
      cancel()
      audioVisemeAnalyzer?.dispose()
      audioVisemeAnalyzer = null

      if (audioContext?.state !== 'closed') {
        audioContext?.close().catch(() => undefined)
      }

      audioContext = null
      audioContextSuspension = null
    },
    isBlocked,
    isDialogueScheduled: (dialogueId) =>
      dialogue?.id === dialogueId ||
      activeRequest?.dialogueIds.slice(activeRequest.nextDialoguePosition).includes(dialogueId) ===
        true ||
      requestQueue.some((request) => request.dialogueIds.includes(dialogueId)),
    isPlaying,
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

      start(audio!).catch(reportPlaybackFailure)
    },
    scheduledDialogueCount,
    skip,
    stop,
  }
}
