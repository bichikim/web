/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type FocusRoomEventContextValue,
  FocusRoomEventProvider,
  useFocusRoomEvents,
} from '../FocusRoomEventContext'
import type {FocusRoomDialogue} from '../schema'

const repositoryMocks = vi.hoisted(() => ({create: vi.fn()}))

vi.mock('../repository', () => ({
  createFocusRoomDialogueRepository: repositoryMocks.create,
}))

const DIALOGUE: FocusRoomDialogue = {
  audioKey: 'entry-audio',
  createdAt: '2026-08-13T00:00:00.000Z',
  durationMs: 1000,
  id: 'entry-dialogue',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '입장 대사'}],
  text: '입장 대사',
  updatedAt: '2026-08-13T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const createDialogue = (id: string): FocusRoomDialogue => ({
  ...DIALOGUE,
  audioKey: `audio-${id}`,
  id,
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: `대사 ${id}`}],
  text: `대사 ${id}`,
})

const createRepository = (dialogues: ReadonlyArray<FocusRoomDialogue>) => ({
  deleteDialogue: vi.fn(),
  dispose: vi.fn(),
  getAudio: vi.fn(async () => new Blob(['audio'])),
  getDialogue: vi.fn(
    async (dialogueId: string) => dialogues.find((dialogue) => dialogue.id === dialogueId) ?? null,
  ),
  getEntryBinding: vi.fn(async () => null),
  listDialogues: vi.fn(async () => dialogues),
  saveDialogue: vi.fn(),
  setEntryBinding: vi.fn(),
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:entry-dialogue'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should release entry audio after an unexpected playback failure', async () => {
  const repository = {
    deleteDialogue: vi.fn(),
    dispose: vi.fn(),
    getAudio: vi.fn(async () => new Blob(['audio'])),
    getDialogue: vi.fn(async () => DIALOGUE),
    getEntryBinding: vi.fn(async () => ({
      dialogueIds: [DIALOGUE.id],
      event: 'room-enter' as const,
      version: 2 as const,
    })),
    listDialogues: vi.fn(async () => [DIALOGUE]),
    saveDialogue: vi.fn(),
    setEntryBinding: vi.fn(),
  }
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('decoder failed'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))

  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:entry-dialogue'))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  expect(events.activeText()).toBeNull()
  expect(events.isEntryPlaybackBlocked()).toBe(false)

  result.unmount()
  expect(repository.dispose).toHaveBeenCalledOnce()
})

it('should play every entry event dialogue continuously', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = {
    ...createRepository(dialogues),
    getEntryBinding: vi.fn(async () => ({
      dialogueIds: dialogues.map((dialogue) => dialogue.id),
      event: 'room-enter' as const,
      version: 2 as const,
    })),
  }
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  let audioIndex = 0
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audioElement = audioElements[audioIndex]
      audioIndex += 1
      return audioElement
    }),
  )
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const result = render(() => (
    <FocusRoomEventProvider>
      <div />
    </FocusRoomEventProvider>
  ))

  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('first'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('second'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2))

  expect(repository.getDialogue.mock.calls).toEqual([['first'], ['second']])
  result.unmount()
})

it('should play a dialogue sequence continuously', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues)
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  let audioIndex = 0
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audioElement = audioElements[audioIndex]
      audioIndex += 1
      return audioElement
    }),
  )
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))
  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  const onDialogueStart = vi.fn(async () => undefined)
  const onSequenceStop = vi.fn(async () => undefined)
  const sequence = events.playDialogueSequence({
    dialogueIds: dialogues.map((dialogue) => dialogue.id),
    onDialogueStart,
    onSequenceStop,
  })
  await waitFor(() => expect(onDialogueStart).toHaveBeenCalledWith('first'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(onDialogueStart).toHaveBeenCalledWith('second'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await sequence

  expect(onDialogueStart.mock.calls).toEqual([['first'], ['second']])
  expect(onSequenceStop).not.toHaveBeenCalled()
  result.unmount()
})

it('should append a requested dialogue behind active event playback', async () => {
  const dialogues = [createDialogue('event'), createDialogue('feed')]
  const repository = createRepository(dialogues)
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  let audioIndex = 0
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audioElement = audioElements[audioIndex]
      audioIndex += 1
      return audioElement
    }),
  )
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))
  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  const eventPlayback = events.playDialogueSequence({
    dialogueIds: ['event'],
    onDialogueStart: vi.fn(),
    onSequenceStop: vi.fn(),
  })
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event'))
  const feedPlayback = events.playDialogue('feed')

  expect(repository.getDialogue).not.toHaveBeenCalledWith('feed')
  expect(events.isDialogueScheduled('event')).toBe(true)
  expect(events.isDialogueScheduled('feed')).toBe(true)
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('feed'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await Promise.all([eventPlayback, feedPlayback])

  expect(repository.getDialogue.mock.calls).toEqual([['event'], ['feed']])
  expect(events.isDialogueScheduled('event')).toBe(false)
  expect(events.isDialogueScheduled('feed')).toBe(false)
  result.unmount()
})

it('should refresh entry bindings changed by another repository owner', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  let storedDialogues: ReadonlyArray<FocusRoomDialogue> = dialogues
  let storedDialogueIds: ReadonlyArray<string> = dialogues.map((dialogue) => dialogue.id)
  const repository = {
    ...createRepository(dialogues),
    getEntryBinding: vi.fn(async () => ({
      dialogueIds: storedDialogueIds,
      event: 'room-enter' as const,
      version: 2 as const,
    })),
    listDialogues: vi.fn(async () => storedDialogues),
  }
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
    new DOMException('Autoplay blocked', 'NotAllowedError'),
  )
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))
  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  expect(events.entryDialogueIds()).toEqual(['first', 'second'])
  storedDialogues = [dialogues[1]].filter((dialogue) => dialogue !== undefined)
  storedDialogueIds = ['second']
  await events.refreshDialogues()

  expect(events.dialogues().map((dialogue) => dialogue.id)).toEqual(['second'])
  expect(events.entryDialogueIds()).toEqual(['second'])
  result.unmount()
})

it('should notify a queued feed batch when the user stops active event playback', async () => {
  const dialogues = [createDialogue('event'), createDialogue('feed')]
  const repository = createRepository(dialogues)
  const audioElement = document.createElement('audio')
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      return audioElement
    }),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))
  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  const eventPlayback = events.playDialogueSequence({
    dialogueIds: ['event'],
    onDialogueStart: vi.fn(),
    onSequenceStop: vi.fn(),
  })
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event'))
  const onFeedStop = vi.fn(async () => undefined)
  const feedPlayback = events.playDialogueSequence({
    dialogueIds: ['feed'],
    onDialogueStart: vi.fn(),
    onSequenceStop: onFeedStop,
  })
  events.onStopEntryPlayback()
  await Promise.all([eventPlayback, feedPlayback])

  expect(repository.getDialogue).not.toHaveBeenCalledWith('feed')
  expect(onFeedStop).toHaveBeenCalledWith(['feed'])
  result.unmount()
})

it('should report the entire sequence as listened when the user stops playback', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second'), createDialogue('third')]
  const repository = createRepository(dialogues)
  const audioElement = document.createElement('audio')
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      return audioElement
    }),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const eventReference: {current?: FocusRoomEventContextValue} = {}
  const Consumer = () => {
    eventReference.current = useFocusRoomEvents()
    return null
  }
  const result = render(() => (
    <FocusRoomEventProvider>
      <Consumer />
    </FocusRoomEventProvider>
  ))
  await waitFor(() => expect(eventReference.current?.isLoading()).toBe(false))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  const onDialogueStart = vi.fn(async () => undefined)
  const onSequenceStop = vi.fn(async () => undefined)
  const dialogueIds = dialogues.map((dialogue) => dialogue.id)
  const sequence = events.playDialogueSequence({
    dialogueIds,
    onDialogueStart,
    onSequenceStop,
  })
  await waitFor(() => expect(onDialogueStart).toHaveBeenCalledWith('first'))
  events.onStopEntryPlayback()
  await sequence

  expect(onDialogueStart.mock.calls).toEqual([['first']])
  expect(onSequenceStop).toHaveBeenCalledWith(dialogueIds)
  result.unmount()
})
