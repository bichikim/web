/** @vitest-environment node */
import {createRoot, createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import type {PDialogue} from '../../focus-room-dialogue/schema'
import {
  createFeedPlaybackController,
  type CreateFeedPlaybackControllerOptions,
} from '../feed-playback'
import type {FeedDialogueMetadata} from '../feed-dialogue-schema'
import type {FeedDialogueListItem} from '../feed-controller'

const LISTENED_AT = '2026-08-14T01:00:00.000Z'
const DIALOGUE_CREATED_AT = '2026-08-14T00:00:00.000Z'

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: DIALOGUE_CREATED_AT,
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'int8',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: DIALOGUE_CREATED_AT,
  version: 1,
  voiceId: 'Yuna',
}

const createMetadata = (dialogueId: string, listenedAt: string | null): FeedDialogueMetadata => ({
  createdAt: DIALOGUE_CREATED_AT,
  dialogueId,
  expiresAt: '2026-08-16T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: `item-${dialogueId}`,
  itemTitle: `피드 ${dialogueId}`,
  listenedAt,
  publishedAt: DIALOGUE_CREATED_AT,
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${dialogueId}`,
  version: 1,
})

const createListItem = (dialogueId: string, listenedAt: string | null): FeedDialogueListItem => ({
  dialogue: {...DIALOGUE, id: dialogueId},
  metadata: createMetadata(dialogueId, listenedAt),
})

const createRepository = () =>
  ({
    listItems: vi.fn(),
    markListened: vi.fn(async () => undefined),
    recoverMissingDialogue: vi.fn(),
  }) satisfies ReturnType<CreateFeedPlaybackControllerOptions['repository']>

const createPlayback = (
  items: ReadonlyArray<FeedDialogueListItem>,
  overrides: Partial<CreateFeedPlaybackControllerOptions> = {},
) => {
  const repository = createRepository()
  const events = {
    deleteDialogue: vi.fn(async () => undefined),
    playDialogueSequence: vi.fn<PEventContextValue['playDialogueSequence']>(),
  } satisfies Pick<PEventContextValue, 'deleteDialogue' | 'playDialogueSequence'>

  return createRoot((dispose) => {
    let isDisposed = false
    const [currentDialogues, setDialogues] = createSignal(items)
    const readDialogues = vi.fn(currentDialogues)
    const scheduleJobs = vi.fn()
    const playback = createFeedPlaybackController({
      createId: () => 'job-1',
      dialogues: readDialogues,
      events,
      isDisposed: () => isDisposed,
      now: () => new Date(LISTENED_AT),
      repository: () => repository,
      scheduleJobs,
      setDialogues,
      ...overrides,
    })

    return {
      dialogues: currentDialogues,
      dispose() {
        isDisposed = true
        dispose()
      },
      events,
      playback,
      readDialogues,
      repository,
      scheduleJobs,
    }
  })
}

it('should not mark an individual dialogue when stopped before playback starts', async () => {
  const view = createPlayback([createListItem(DIALOGUE.id, null)])
  vi.mocked(view.events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onSequenceStop(options.dialogueIds)
  })

  await view.playback.listen(DIALOGUE.id)

  expect(view.repository.markListened).not.toHaveBeenCalled()
  expect(view.dialogues()[0]?.metadata.listenedAt).toBeNull()
  view.dispose()
})

it('should mark an individual dialogue when playback starts', async () => {
  const view = createPlayback([createListItem(DIALOGUE.id, null)])
  vi.mocked(view.events.playDialogueSequence).mockImplementation(async (options) => {
    const dialogueId = options.dialogueIds[0]
    if (dialogueId === undefined) {
      throw new Error('Expected an individual dialogue.')
    }

    await options.onDialogueStart(dialogueId)
  })

  await view.playback.listen(DIALOGUE.id)

  expect(view.repository.markListened).toHaveBeenCalledOnce()
  expect(view.repository.markListened).toHaveBeenCalledWith(DIALOGUE.id, LISTENED_AT)
  expect(view.dialogues()[0]?.metadata.listenedAt).toBe(LISTENED_AT)
  view.dispose()
})

it('should ignore an individual dialogue while another individual playback is active', async () => {
  const view = createPlayback([createListItem('first', null), createListItem('second', null)])
  const playback = Promise.withResolvers<void>()
  vi.mocked(view.events.playDialogueSequence).mockReturnValue(playback.promise)

  const first = view.playback.listen('first')
  const second = view.playback.listen('second')

  expect(view.playback.isListening()).toBe(true)
  expect(view.events.playDialogueSequence).toHaveBeenCalledOnce()

  playback.resolve()
  await Promise.all([first, second])

  expect(view.events.playDialogueSequence).toHaveBeenCalledOnce()
  expect(view.playback.isListening()).toBe(false)
  view.dispose()
})

it('should mark every dialogue in a stopped batch', async () => {
  const view = createPlayback([createListItem('first', null), createListItem('second', null)])
  vi.mocked(view.events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onSequenceStop(options.dialogueIds)
  })

  await view.playback.listenAll()

  expect(view.repository.markListened).toHaveBeenCalledTimes(2)
  expect(view.repository.markListened).toHaveBeenCalledWith('first', LISTENED_AT)
  expect(view.repository.markListened).toHaveBeenCalledWith('second', LISTENED_AT)
  expect(view.dialogues().every((item) => item.metadata.listenedAt === LISTENED_AT)).toBe(true)
  view.dispose()
})

it.each(['listen', 'listenAll'] as const)(
  'should block both entrypoints before batch lookup while %s is pending',
  async (method) => {
    const view = createPlayback([createListItem(DIALOGUE.id, null)])
    const sequence = Promise.withResolvers<void>()
    view.events.playDialogueSequence.mockReturnValue(sequence.promise)

    const active = view.playback[method](DIALOGUE.id)
    expect(view.playback.isListening()).toBe(true)
    view.readDialogues.mockClear()

    const completed: Array<string> = []
    const individual = view.playback.listen('other').then(() => completed.push('individual'))
    const batch = view.playback.listenAll().then(() => completed.push('batch'))
    await Promise.resolve()

    expect(completed).toEqual(['individual', 'batch'])
    expect(view.readDialogues).not.toHaveBeenCalled()
    expect(view.events.playDialogueSequence).toHaveBeenCalledOnce()
    expect(view.playback.isListening()).toBe(true)

    sequence.resolve()
    await Promise.all([active, individual, batch])
    expect(view.playback.isListening()).toBe(false)
    view.dispose()
  },
)

it.each(['listen', 'listenAll'] as const)(
  'should acquire busy before synchronous reentry from %s playback',
  async (method) => {
    const view = createPlayback([createListItem(DIALOGUE.id, null)])
    const reentries: Array<Promise<void>> = []
    view.events.playDialogueSequence.mockImplementation(() => {
      expect(view.playback.isListening()).toBe(true)
      view.readDialogues.mockClear()
      reentries.push(view.playback.listen('other'), view.playback.listenAll())
      expect(view.readDialogues).not.toHaveBeenCalled()
      return Promise.resolve()
    })

    await view.playback[method](DIALOGUE.id)
    await Promise.all(reentries)

    expect(view.events.playDialogueSequence).toHaveBeenCalledOnce()
    expect(view.playback.isListening()).toBe(false)
    view.dispose()
  },
)

it.each([
  {items: [], name: 'empty feed'},
  {items: [createListItem('already-listened', LISTENED_AT)], name: 'already listened feed'},
])(
  'should complete an empty unread batch without playback or cleanup for $name',
  async ({items}) => {
    const isDisposed = vi.fn(() => false)
    const view = createPlayback(items, {isDisposed})
    let completed = false
    const result = view.playback.listenAll().then(() => {
      completed = true
    })

    expect(view.playback.isListening()).toBe(false)
    await Promise.resolve()
    expect(completed).toBe(true)
    expect(view.events.playDialogueSequence).not.toHaveBeenCalled()
    expect(view.repository.markListened).not.toHaveBeenCalled()
    expect(isDisposed).not.toHaveBeenCalled()
    await result
    view.dispose()
  },
)

it('should select unread dialogues in reverse order without marking them on completion', async () => {
  const items = [
    createListItem('newest', null),
    createListItem('read', LISTENED_AT),
    createListItem('oldest', null),
  ]
  const view = createPlayback(items)
  view.events.playDialogueSequence.mockResolvedValue()

  await view.playback.listenAll()

  expect(view.events.playDialogueSequence.mock.calls[0]?.[0].dialogueIds).toEqual([
    'oldest',
    'newest',
  ])
  expect(view.dialogues()).toBe(items)
  expect(view.repository.markListened).not.toHaveBeenCalled()
  view.dispose()
})

it('should mark only the started dialogue when a batch finishes without an explicit stop', async () => {
  const view = createPlayback([createListItem('newest', null), createListItem('oldest', null)])
  view.events.playDialogueSequence.mockImplementation(async (options) => {
    await options.onDialogueStart('oldest')
  })

  await view.playback.listenAll()

  expect(view.repository.markListened).toHaveBeenCalledExactlyOnceWith('oldest', LISTENED_AT)
  expect(view.dialogues().map((item) => item.metadata.listenedAt)).toEqual([null, LISTENED_AT])
  view.dispose()
})

it.each(['listen', 'listenAll'] as const)(
  'should clear busy before the public %s completion without another microtask',
  async (method) => {
    const view = createPlayback([createListItem(DIALOGUE.id, null)])
    const sequence = Promise.withResolvers<void>()
    const order: Array<string> = []
    view.events.playDialogueSequence.mockReturnValue(sequence.promise)
    const result = view.playback[method](DIALOGUE.id).then(() => order.push('public'))

    expect(view.playback.isListening()).toBe(true)
    sequence.resolve()
    expect(view.playback.isListening()).toBe(true)
    queueMicrotask(() => order.push(`busy:${view.playback.isListening()}`))

    await Promise.resolve()
    expect(order).toEqual(['busy:false'])
    await Promise.resolve()
    expect(order).toEqual(['busy:false', 'public'])
    await result
    view.dispose()
  },
)

it.each(['listen', 'listenAll'] as const)(
  'should reject %s with the original synchronous playback error after immediate cleanup',
  async (method) => {
    const view = createPlayback([createListItem(DIALOGUE.id, null)])
    const error = new Error('synchronous playback failure')
    view.events.playDialogueSequence.mockImplementation(() => {
      expect(view.playback.isListening()).toBe(true)
      throw error
    })

    const result = view.playback[method](DIALOGUE.id)
    expect(result).toBeInstanceOf(Promise)
    expect(view.playback.isListening()).toBe(false)
    const observed = result.catch((reason: unknown) => reason)
    let rejected = false
    result.catch(() => {
      rejected = true
    })
    await Promise.resolve()
    expect(rejected).toBe(true)
    expect(await observed).toBe(error)
    expect(view.repository.markListened).not.toHaveBeenCalled()
    view.dispose()
  },
)

it('should reject synchronous batch lookup errors before acquiring busy', async () => {
  const error = new Error('lookup failure')
  const isDisposed = vi.fn(() => false)
  const view = createPlayback([], {
    dialogues: () => {
      throw error
    },
    isDisposed,
  })

  const result = view.playback.listenAll()
  expect(result).toBeInstanceOf(Promise)
  expect(view.playback.isListening()).toBe(false)
  expect(view.events.playDialogueSequence).not.toHaveBeenCalled()
  expect(isDisposed).not.toHaveBeenCalled()
  view.dispose()
  return expect(result).rejects.toBe(error)
})

it.each(['listen', 'listenAll'] as const)(
  'should preserve rejection identity and cleanup timing for pending %s',
  async (method) => {
    const view = createPlayback([createListItem(DIALOGUE.id, null)])
    const sequence = Promise.withResolvers<void>()
    const error = new Error('asynchronous playback failure')
    const order: Array<string> = []
    view.events.playDialogueSequence.mockReturnValue(sequence.promise)
    const result = view.playback[method](DIALOGUE.id).catch((reason: unknown) => {
      order.push('public')
      expect(reason).toBe(error)
    })

    sequence.reject(error)
    expect(view.playback.isListening()).toBe(true)
    queueMicrotask(() => order.push(`busy:${view.playback.isListening()}`))
    await Promise.resolve()
    expect(order).toEqual(['busy:false'])
    await Promise.resolve()
    expect(order).toEqual(['busy:false', 'public'])
    await result
    expect(view.repository.markListened).not.toHaveBeenCalled()
    view.dispose()
  },
)

it.each([
  {completion: 'resolve', method: 'listen'},
  {completion: 'reject', method: 'listen'},
  {completion: 'resolve', method: 'listenAll'},
  {completion: 'reject', method: 'listenAll'},
] as const)(
  'should retain busy when disposed during pending $method on $completion',
  async ({completion, method}) => {
    const view = createPlayback([createListItem(DIALOGUE.id, null)])
    const sequence = Promise.withResolvers<void>()
    view.events.playDialogueSequence.mockReturnValue(sequence.promise)
    const error = new Error('disposed playback failure')
    const result = view.playback[method](DIALOGUE.id).catch((reason: unknown) => {
      expect(reason).toBe(error)
      return reason
    })

    view.dispose()
    if (completion === 'reject') {
      sequence.reject(error)
    } else {
      sequence.resolve()
    }
    expect(await result).toBe(completion === 'reject' ? error : undefined)

    expect(view.playback.isListening()).toBe(true)
    expect(view.repository.markListened).not.toHaveBeenCalled()
  },
)

it('should preserve the playback receiver and shared start and recovery callbacks', async () => {
  const view = createPlayback([createListItem(DIALOGUE.id, null)])
  view.events.playDialogueSequence.mockResolvedValue()
  await view.playback.listen(DIALOGUE.id)
  await view.playback.listenAll()
  const individual = view.events.playDialogueSequence.mock.calls[0]?.[0]
  const batch = view.events.playDialogueSequence.mock.calls[1]?.[0]
  expect(individual).toBeDefined()
  expect(batch).toBeDefined()
  expect(individual?.onDialogueStart).toBe(batch?.onDialogueStart)
  expect(individual?.onDialogueUnavailable).toBe(batch?.onDialogueUnavailable)
  expect(view.events.playDialogueSequence.mock.contexts[0]).toBe(view.events)
  expect(view.events.playDialogueSequence.mock.contexts[1]).toBe(view.events)

  view.repository.listItems.mockResolvedValue([])
  view.repository.recoverMissingDialogue.mockResolvedValue(true)
  await batch?.onDialogueUnavailable?.(DIALOGUE.id)

  expect(view.repository.recoverMissingDialogue).toHaveBeenCalledWith(
    expect.objectContaining({dialogueId: DIALOGUE.id}),
  )
  expect(view.dialogues()).toEqual([])
  expect(view.scheduleJobs).toHaveBeenCalledWith(['job-1'])
  expect(view.events.deleteDialogue).toHaveBeenCalledWith(DIALOGUE.id)
  expect(view.repository.markListened).not.toHaveBeenCalled()
  view.dispose()
})
