/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import type {PDialogueRepository} from '../repository'
import {
  createDialoguePlaybackQueue,
  type DialoguePlaybackRequest,
  type PlaybackCompletion,
  type PlayPDialogueSequenceOptions,
} from '../entry-playback-controller/queue'
import {MAX_LATEST_REPLACEMENT_DIALOGUE_IDS} from '../dialogue-playback-policy'

const createSequenceOptions = (
  dialogueId: string,
  useLatestReplacement = false,
): PlayPDialogueSequenceOptions => ({
  dialogueIds: [dialogueId],
  onDialogueStart: vi.fn(),
  onSequenceStop: vi.fn(),
  ...(useLatestReplacement ? {replacementPolicy: 'latest' as const} : {}),
})

it('should coalesce latest replacement requests while one is scheduled', async () => {
  let resolvePlayback!: (completion: PlaybackCompletion) => void
  let activeRequest!: DialoguePlaybackRequest
  let reportProgress!: () => void
  const pendingPlayback = new Promise<PlaybackCompletion>((resolve) => {
    resolvePlayback = resolve
  })
  const playRequest = vi.fn(
    (request: DialoguePlaybackRequest, _generation: number, onProgress: () => void) => {
      activeRequest = request
      reportProgress = onProgress
      return pendingPlayback
    },
  )
  const queue = createDialoguePlaybackQueue({
    finishPlayback: vi.fn(),
    getGeneration: () => 0,
    incrementGeneration: vi.fn(),
    isDisposed: () => false,
    onQueueIdle: vi.fn(),
    onRequestFailure: vi.fn(),
    playRequest,
  })
  const repository = {} as PDialogueRepository

  const first = queue.enqueue(repository, {
    ...createSequenceOptions('first', true),
    dialogueIds: Array.from({length: 40}, (_, index) => `dialogue-${index}`),
  })
  expect(queue.scheduledDialogueCount()).toBe(MAX_LATEST_REPLACEMENT_DIALOGUE_IDS)
  expect(activeRequest.getCurrentDialogueId()).toBe('dialogue-8')

  const latestDialogueIds = Array.from({length: 40}, (_, index) => `latest-${index}`)
  const second = queue.enqueue(repository, {
    ...createSequenceOptions('second', true),
    dialogueIds: latestDialogueIds,
  })
  await expect(second).resolves.toBe('cancelled')
  expect(queue.isScheduled('dialogue-8')).toBe(true)
  expect(queue.isScheduled('dialogue-39')).toBe(false)
  expect(queue.isScheduled('latest-39')).toBe(true)
  expect(queue.scheduledDialogueCount()).toBe(MAX_LATEST_REPLACEMENT_DIALOGUE_IDS)
  expect(activeRequest.applyPendingReplacement()).toBe(true)
  expect(activeRequest.getCurrentDialogueId()).toBe('latest-9')
  reportProgress()
  expect(queue.scheduledDialogueCount()).toBe(MAX_LATEST_REPLACEMENT_DIALOGUE_IDS - 1)
  expect(playRequest).toHaveBeenCalledOnce()

  resolvePlayback('ended')
  await expect(first).resolves.toBe('ended')
})

it.each(['rejected', 'failed'] as const)(
  'should retry pending latest replacement after an active request is %s',
  async (failureMode) => {
    const currentDialogueIds = Array.from(
      {length: MAX_LATEST_REPLACEMENT_DIALOGUE_IDS},
      (_, index) => `current-${index}`,
    )
    const latestDialogueIds = Array.from(
      {length: MAX_LATEST_REPLACEMENT_DIALOGUE_IDS + 8},
      (_, index) => `latest-${index}`,
    )
    const requestDialogueIds: Array<Array<string>> = []
    const playbackResults: Array<{
      reject: (error: unknown) => void
      resolve: (completion: PlaybackCompletion) => void
    }> = []
    let requestCount = 0
    const playRequest = vi.fn(
      (request: DialoguePlaybackRequest, _generation: number, _onProgress: () => void) => {
        requestCount += 1
        if (requestCount === 2) {
          const dialogueIds: Array<string> = []
          let dialogueId = request.getCurrentDialogueId()

          while (dialogueId !== undefined) {
            dialogueIds.push(dialogueId)
            request.advanceDialogue()
            dialogueId = request.getCurrentDialogueId()
          }
          requestDialogueIds.push(dialogueIds)
        }

        return new Promise<PlaybackCompletion>((resolve, reject) => {
          playbackResults.push({reject, resolve})
        })
      },
    )
    const queue = createDialoguePlaybackQueue({
      finishPlayback: vi.fn(),
      getGeneration: () => 0,
      incrementGeneration: vi.fn(),
      isDisposed: () => false,
      onQueueIdle: vi.fn(),
      onRequestFailure: vi.fn(),
      playRequest,
    })
    const repository = {} as PDialogueRepository

    const first = queue.enqueue(repository, {
      ...createSequenceOptions('first', true),
      dialogueIds: currentDialogueIds,
    })
    const second = queue.enqueue(repository, {
      ...createSequenceOptions('second', true),
      dialogueIds: latestDialogueIds,
    })

    await expect(second).resolves.toBe('cancelled')
    expect(playbackResults).toHaveLength(1)

    if (failureMode === 'rejected') {
      playbackResults[0]?.reject(new Error('playback failed'))
    } else {
      playbackResults[0]?.resolve('failed')
    }

    await vi.waitFor(() => expect(playRequest).toHaveBeenCalledTimes(2))
    expect(requestDialogueIds[0]).toEqual([
      currentDialogueIds[0],
      ...latestDialogueIds.slice(-(MAX_LATEST_REPLACEMENT_DIALOGUE_IDS - 1)),
    ])
    playbackResults[1]?.resolve('ended')

    await expect(first).resolves.toBe('ended')
  },
)

it('should not revive a settled latest replacement after a late failure', async () => {
  let rejectPlayback!: (error: unknown) => void
  const onRequestFailure = vi.fn()
  const playRequest = vi.fn(
    (_request: DialoguePlaybackRequest, _generation: number, _onProgress: () => void) =>
      new Promise<PlaybackCompletion>((_resolve, reject) => {
        rejectPlayback = reject
      }),
  )
  const queue = createDialoguePlaybackQueue({
    finishPlayback: vi.fn(),
    getGeneration: () => 0,
    incrementGeneration: vi.fn(),
    isDisposed: () => false,
    onQueueIdle: vi.fn(),
    onRequestFailure,
    playRequest,
  })
  const repository = {} as PDialogueRepository

  const first = queue.enqueue(repository, {
    ...createSequenceOptions('first', true),
    dialogueIds: ['first'],
  })
  const second = queue.enqueue(repository, {
    ...createSequenceOptions('second', true),
    dialogueIds: ['latest'],
  })
  await expect(second).resolves.toBe('cancelled')

  queue.finish(false)
  await expect(first).resolves.toBe('cancelled')
  rejectPlayback(new Error('late playback failure'))

  await vi.waitFor(() => expect(onRequestFailure).toHaveBeenCalledOnce())
  expect(playRequest).toHaveBeenCalledOnce()
  expect(queue.scheduledDialogueCount()).toBe(0)
})

it('should cancel new requests after disposal', async () => {
  const playRequest = vi.fn()
  const queue = createDialoguePlaybackQueue({
    finishPlayback: vi.fn(),
    getGeneration: () => 0,
    incrementGeneration: vi.fn(),
    isDisposed: () => true,
    onQueueIdle: vi.fn(),
    onRequestFailure: vi.fn(),
    playRequest,
  })

  await expect(
    queue.enqueue({} as PDialogueRepository, createSequenceOptions('disposed')),
  ).resolves.toBe('cancelled')
  expect(playRequest).not.toHaveBeenCalled()
  expect(queue.scheduledDialogueCount()).toBe(0)
})

it.each(['cancelled', 'stopped'] as const)(
  'should settle a request when playback completes as %s',
  async (completion) => {
    const onSequenceStop = vi.fn()
    const queue = createDialoguePlaybackQueue({
      finishPlayback: vi.fn(),
      getGeneration: () => 0,
      incrementGeneration: vi.fn(),
      isDisposed: () => false,
      onQueueIdle: vi.fn(),
      onRequestFailure: vi.fn(),
      playRequest: vi.fn().mockResolvedValue(completion),
    })

    await expect(
      queue.enqueue({} as PDialogueRepository, {
        ...createSequenceOptions('completion'),
        onSequenceStop,
      }),
    ).resolves.toBe(completion)
    expect(onSequenceStop).toHaveBeenCalledTimes(completion === 'stopped' ? 1 : 0)
  },
)
