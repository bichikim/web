// oxlint-disable eslint/no-await-in-loop -- Dialogue requests must finish in queue order.
import {type Accessor, createSignal} from 'solid-js'

import type {PDialogueRepository} from '../repository'

export interface PlayPDialogueSequenceOptions {
  readonly dialogueIds: ReadonlyArray<string>
  readonly onDialogueStart: (dialogueId: string) => Promise<void> | void
  readonly onDialogueUnavailable?: (dialogueId: string) => Promise<void> | void
  readonly onSequenceStop: (dialogueIds: ReadonlyArray<string>) => Promise<void> | void
}

export type PlaybackCompletion = 'cancelled' | 'ended' | 'failed' | 'missing' | 'stopped'

export interface PlaybackQueueRequest {
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

export interface CreateDialoguePlaybackQueueOptions {
  readonly finishPlayback: (completion: PlaybackCompletion) => void
  readonly getGeneration: () => number
  readonly incrementGeneration: () => void
  readonly isDisposed: () => boolean
  readonly onQueueIdle: () => void
  readonly onRequestFailure: () => void
  readonly playRequest: (
    request: PlaybackQueueRequest,
    generation: number,
    onProgress: () => void,
  ) => Promise<PlaybackCompletion>
}

export interface DialoguePlaybackQueue {
  readonly enqueue: (
    repository: PDialogueRepository,
    options: PlayPDialogueSequenceOptions,
  ) => Promise<void>
  readonly finish: (notifyStop: boolean) => void
  readonly isScheduled: (dialogueId: string) => boolean
  readonly scheduledDialogueCount: Accessor<number>
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

/** Serializes dialogue sequence requests independently from the active audio session. */
export const createDialoguePlaybackQueue = (
  options: CreateDialoguePlaybackQueueOptions,
): DialoguePlaybackQueue => {
  const [scheduledDialogueCount, setScheduledDialogueCount] = createSignal(0)
  let activeRequest: PlaybackQueueRequest | null = null
  let isDraining = false
  const requestQueue: Array<PlaybackQueueRequest> = []
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

  const processQueueRequest = async (request: PlaybackQueueRequest) => {
    activeRequest = request
    updateScheduledDialogueCount()
    const generation = options.getGeneration()

    try {
      const completion = await options.playRequest(
        request,
        generation,
        updateScheduledDialogueCount,
      )

      if (completion === 'ended' || completion === 'failed') {
        await settleQueueRequest(request, false)
      }
    } catch (error: unknown) {
      options.onRequestFailure()
      failQueueRequest(request, error)
    }

    if (activeRequest === request) {
      activeRequest = null
      updateScheduledDialogueCount()
    }
  }

  const drainQueue = async () => {
    if (isDraining || options.isDisposed()) {
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
      options.onQueueIdle()
    }
  }

  return {
    enqueue: (repository, sequenceOptions) =>
      new Promise<void>((resolve, reject) => {
        requestQueue.push({
          dialogueIds: [...sequenceOptions.dialogueIds],
          nextDialoguePosition: 0,
          onDialogueStart: sequenceOptions.onDialogueStart,
          onDialogueUnavailable: sequenceOptions.onDialogueUnavailable,
          onSequenceStop: sequenceOptions.onSequenceStop,
          reject,
          repository,
          resolve,
          settled: false,
        })
        updateScheduledDialogueCount()
        drainQueue().catch(reportQueueFailure)
      }),
    finish(notifyStop) {
      options.incrementGeneration()
      const completion = notifyStop ? 'stopped' : 'cancelled'
      const requests = activeRequest === null ? [...requestQueue] : [activeRequest, ...requestQueue]
      requestQueue.length = 0
      activeRequest = null
      updateScheduledDialogueCount()
      options.finishPlayback(completion)
      requests.forEach((request) => {
        settleQueueRequest(request, notifyStop).catch(reportSettlementFailure)
      })
    },
    isScheduled: (dialogueId) =>
      activeRequest?.dialogueIds.slice(activeRequest.nextDialoguePosition).includes(dialogueId) ===
        true || requestQueue.some((request) => request.dialogueIds.includes(dialogueId)),
    scheduledDialogueCount,
  }
}
