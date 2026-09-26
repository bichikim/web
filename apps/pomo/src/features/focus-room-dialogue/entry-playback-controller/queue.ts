// oxlint-disable eslint/no-await-in-loop -- Dialogue requests must finish in queue order.
import {type Accessor, createSignal} from 'solid-js'

import {
  type DialogueSequenceReplacementPolicy,
  MAX_LATEST_REPLACEMENT_DIALOGUE_IDS,
} from '../dialogue-playback-policy'
import type {PDialogueRepository} from '../repository'

export interface PlayPDialogueSequenceOptions {
  readonly dialogueIds: ReadonlyArray<string>
  readonly onDialogueStart: (dialogueId: string) => Promise<void> | void
  readonly onDialogueSkipped?: (dialogueId: string) => Promise<void> | void
  readonly onDialogueUnavailable?: (dialogueId: string) => Promise<void> | void
  readonly onSequenceStop: (dialogueIds: ReadonlyArray<string>) => Promise<void> | void
  readonly replacementPolicy?: DialogueSequenceReplacementPolicy
}

export type PlaybackCompletion = 'cancelled' | 'ended' | 'failed' | 'missing' | 'stopped'

/** Exposes only queue-owned operations needed by the audio playback adapter. */
export interface DialoguePlaybackRequest {
  readonly advanceDialogue: () => void
  readonly applyPendingReplacement: () => boolean
  readonly getCurrentDialogueId: () => string | undefined
  readonly onDialogueStart: PlayPDialogueSequenceOptions['onDialogueStart']
  readonly onDialogueSkipped: PlayPDialogueSequenceOptions['onDialogueSkipped']
  readonly onDialogueUnavailable: PlayPDialogueSequenceOptions['onDialogueUnavailable']
  readonly repository: PDialogueRepository
}

interface PlaybackQueueRequest {
  readonly dialogueIds: Array<string>
  readonly replacementPolicy: DialogueSequenceReplacementPolicy | null
  isProcessing: boolean
  nextDialoguePosition: number
  readonly onDialogueStart: PlayPDialogueSequenceOptions['onDialogueStart']
  readonly onDialogueSkipped: PlayPDialogueSequenceOptions['onDialogueSkipped']
  readonly onDialogueUnavailable: PlayPDialogueSequenceOptions['onDialogueUnavailable']
  readonly onSequenceStop: PlayPDialogueSequenceOptions['onSequenceStop']
  pendingDialogueIds: ReadonlyArray<string> | null
  readonly reject: (error: unknown) => void
  readonly repository: PDialogueRepository
  readonly resolve: (completion: PlaybackCompletion) => void
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
    request: DialoguePlaybackRequest,
    generation: number,
    onProgress: () => void,
  ) => Promise<PlaybackCompletion>
}

export interface DialoguePlaybackQueue {
  readonly enqueue: (
    repository: PDialogueRepository,
    options: PlayPDialogueSequenceOptions,
  ) => Promise<PlaybackCompletion>
  readonly finish: (notifyStop: boolean) => void
  readonly isScheduled: (dialogueId: string) => boolean
  readonly scheduledDialogueCount: Accessor<number>
}

const settleQueueRequest = async (
  request: PlaybackQueueRequest,
  completion: PlaybackCompletion,
) => {
  if (request.settled) {
    return
  }

  request.settled = true

  try {
    if (completion === 'stopped') {
      await request.onSequenceStop([...request.dialogueIds])
    }

    request.resolve(completion)
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

const applyPendingReplacement = (request: PlaybackQueueRequest) => {
  const replacementDialogueIds = request.pendingDialogueIds

  if (replacementDialogueIds === null) {
    return false
  }

  request.dialogueIds.splice(0, request.dialogueIds.length, ...replacementDialogueIds)
  request.pendingDialogueIds = null
  request.nextDialoguePosition = 0
  return true
}

const createPlaybackQueueRequest = (request: PlaybackQueueRequest): DialoguePlaybackRequest => ({
  advanceDialogue: () => {
    request.nextDialoguePosition += 1
  },
  applyPendingReplacement: () => applyPendingReplacement(request),
  getCurrentDialogueId: () => request.dialogueIds[request.nextDialoguePosition],
  onDialogueSkipped: request.onDialogueSkipped,
  onDialogueStart: request.onDialogueStart,
  onDialogueUnavailable: request.onDialogueUnavailable,
  repository: request.repository,
})

interface RequeuePendingReplacementRequestOptions {
  readonly activeRequest: PlaybackQueueRequest | null
  readonly isDisposed: () => boolean
  readonly request: PlaybackQueueRequest
}

const requeuePendingReplacementRequest = (options: RequeuePendingReplacementRequestOptions) => {
  const {activeRequest, isDisposed, request} = options
  const replacementDialogueIds = request.pendingDialogueIds

  if (
    request.settled ||
    activeRequest !== request ||
    request.replacementPolicy !== 'latest' ||
    replacementDialogueIds === null ||
    replacementDialogueIds.length === 0 ||
    isDisposed()
  ) {
    return false
  }

  const currentDialogueId = request.dialogueIds[request.nextDialoguePosition]
  const retryDialogueIds = [
    ...(currentDialogueId === undefined ? [] : [currentDialogueId]),
    ...replacementDialogueIds,
  ].slice(-MAX_LATEST_REPLACEMENT_DIALOGUE_IDS)

  request.dialogueIds.splice(0, request.dialogueIds.length, ...retryDialogueIds)
  request.pendingDialogueIds = null
  request.nextDialoguePosition = 0
  return true
}

const isDialogueScheduledInRequest = (request: PlaybackQueueRequest | null, dialogueId: string) => {
  if (request === null) {
    return false
  }

  if (request.pendingDialogueIds !== null) {
    return (
      request.dialogueIds[request.nextDialoguePosition] === dialogueId ||
      request.pendingDialogueIds.includes(dialogueId)
    )
  }

  return request.dialogueIds.slice(request.nextDialoguePosition).includes(dialogueId)
}

const getScheduledDialogueCount = (
  activeRequest: PlaybackQueueRequest | null,
  requestQueue: ReadonlyArray<PlaybackQueueRequest>,
) => {
  const activeCount =
    activeRequest === null
      ? 0
      : activeRequest.pendingDialogueIds === null
        ? activeRequest.dialogueIds.length - activeRequest.nextDialoguePosition
        : Math.min(1, activeRequest.dialogueIds.length - activeRequest.nextDialoguePosition) +
          activeRequest.pendingDialogueIds.length
  const queuedCount = requestQueue.reduce((count, request) => count + request.dialogueIds.length, 0)

  return activeCount + queuedCount
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
    setScheduledDialogueCount(getScheduledDialogueCount(activeRequest, requestQueue))
  }

  const requeuePendingReplacement = (request: PlaybackQueueRequest) => {
    const isRequeued = requeuePendingReplacementRequest({
      activeRequest,
      isDisposed: options.isDisposed,
      request,
    })

    if (isRequeued) {
      activeRequest = null
      requestQueue.unshift(request)
      updateScheduledDialogueCount()
    }

    return isRequeued
  }

  const processQueueRequest = async (request: PlaybackQueueRequest) => {
    activeRequest = request
    request.isProcessing = true
    updateScheduledDialogueCount()
    const generation = options.getGeneration()

    try {
      const completion = await options.playRequest(
        createPlaybackQueueRequest(request),
        generation,
        updateScheduledDialogueCount,
      )
      request.isProcessing = false

      if (completion === 'failed' && requeuePendingReplacement(request)) {
        return
      }

      await settleQueueRequest(request, completion)
    } catch (error: unknown) {
      request.isProcessing = false
      options.onRequestFailure()

      if (!requeuePendingReplacement(request)) {
        failQueueRequest(request, error)
      }
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
      new Promise<PlaybackCompletion>((resolve, reject) => {
        if (options.isDisposed()) {
          resolve('cancelled')
          return
        }

        const dialogueIds =
          sequenceOptions.replacementPolicy === 'latest'
            ? sequenceOptions.dialogueIds.slice(-MAX_LATEST_REPLACEMENT_DIALOGUE_IDS)
            : [...sequenceOptions.dialogueIds]
        if (
          sequenceOptions.replacementPolicy === 'latest' &&
          activeRequest?.replacementPolicy === 'latest' &&
          activeRequest.isProcessing
        ) {
          const remainingCount =
            activeRequest.dialogueIds.length - activeRequest.nextDialoguePosition
          const currentDialogueCount = Math.min(1, remainingCount)
          activeRequest.pendingDialogueIds = dialogueIds.slice(
            -(MAX_LATEST_REPLACEMENT_DIALOGUE_IDS - currentDialogueCount),
          )
          updateScheduledDialogueCount()
          resolve('cancelled')
          return
        }

        const request = {
          dialogueIds,
          isProcessing: false,
          nextDialoguePosition: 0,
          onDialogueSkipped: sequenceOptions.onDialogueSkipped,
          onDialogueStart: sequenceOptions.onDialogueStart,
          onDialogueUnavailable: sequenceOptions.onDialogueUnavailable,
          onSequenceStop: sequenceOptions.onSequenceStop,
          pendingDialogueIds: null,
          reject,
          replacementPolicy: sequenceOptions.replacementPolicy ?? null,
          repository,
          resolve,
          settled: false,
        }
        const pendingReplacementPosition =
          request.replacementPolicy === 'latest'
            ? requestQueue.findIndex(
                (queuedRequest) => queuedRequest.replacementPolicy === 'latest',
              )
            : -1

        if (pendingReplacementPosition >= 0) {
          const [previousRequest] = requestQueue.splice(pendingReplacementPosition, 1, request)
          if (previousRequest !== undefined) {
            settleQueueRequest(previousRequest, 'cancelled').catch(reportSettlementFailure)
          }
        } else {
          requestQueue.push(request)
        }
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
        settleQueueRequest(request, completion).catch(reportSettlementFailure)
      })
    },
    isScheduled: (dialogueId) =>
      isDialogueScheduledInRequest(activeRequest, dialogueId) ||
      requestQueue.some((request) => request.dialogueIds.includes(dialogueId)),
    scheduledDialogueCount,
  }
}
