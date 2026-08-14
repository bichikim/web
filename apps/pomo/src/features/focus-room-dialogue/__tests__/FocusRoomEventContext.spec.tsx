/** @vitest-environment jsdom */

import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type FocusRoomEventContextValue,
  FocusRoomEventProvider,
  useFocusRoomEvents,
} from '../FocusRoomEventContext'
import type {DialogueEventBinding, FocusRoomDialogue} from '../schema'

const repositoryMocks = vi.hoisted(() => ({create: vi.fn()}))

vi.mock('../repository', () => ({
  createFocusRoomDialogueRepository: repositoryMocks.create,
}))

const createDialogue = (id: string, segments = [`대사 ${id}`]): FocusRoomDialogue => ({
  audioKey: `audio-${id}`,
  createdAt: '2026-08-13T00:00:00.000Z',
  durationMs: segments.length * 1000,
  id,
  modelId: 'full',
  segments: segments.map((text, index) => ({
    durationMs: 700,
    index,
    startMs: index * 1000,
    text,
  })),
  text: segments.join('\n'),
  updatedAt: '2026-08-13T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

const createRepository = (
  dialogues: ReadonlyArray<FocusRoomDialogue>,
  bindings: ReadonlyArray<DialogueEventBinding> = [],
) => ({
  deleteDialogue: vi.fn(async () => undefined),
  dispose: vi.fn(),
  getAudio: vi.fn(async () => new Blob(['audio'])),
  getDialogue: vi.fn(
    async (dialogueId: string) => dialogues.find((dialogue) => dialogue.id === dialogueId) ?? null,
  ),
  listDialogues: vi.fn(async () => dialogues),
  listEventBindings: vi.fn(async () => bindings),
  saveDialogue: vi.fn(),
  setEntryBinding: vi.fn(),
  setEventBinding: vi.fn(),
})

const renderContext = async () => {
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

  if (eventReference.current === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  return {events: eventReference.current, result}
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:focus-room-dialogue'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should release entry audio after an unexpected playback failure', async () => {
  const dialogue = createDialogue('entry')
  const repository = createRepository(
    [dialogue],
    [{dialogueIds: [dialogue.id], event: 'room-enter', version: 2}],
  )
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('decoder failed'))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const {events, result} = await renderContext()
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:focus-room-dialogue'))

  expect(events.activeText()).toBeNull()
  expect(events.activeSegmentCount()).toBe(0)
  expect(events.activeSegmentPosition()).toBeNull()
  expect(events.isDialoguePlaybackBlocked()).toBe(false)
  result.unmount()
  expect(repository.dispose).toHaveBeenCalledOnce()
})

it('should play every entry event dialogue continuously', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues, [
    {dialogueIds: ['first', 'second'], event: 'room-enter', version: 2},
  ])
  const audioElements = [document.createElement('audio'), document.createElement('audio')]
  let audioIndex = 0
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audio = audioElements[audioIndex]
      audioIndex += 1
      return audio
    }),
  )
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()

  const {result} = await renderContext()
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2))

  expect(repository.getDialogue.mock.calls).toEqual([['first'], ['second']])
  result.unmount()
})

it('should expose the active segment position while audio advances', async () => {
  const dialogue = createDialogue('entry', ['첫 대사', '두 번째 대사'])
  const repository = createRepository(
    [dialogue],
    [{dialogueIds: [dialogue.id], event: 'room-enter', version: 2}],
  )
  const audio = document.createElement('audio')
  let frameCallback: FrameRequestCallback | undefined
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      return audio
    }),
  )
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback
      return 1
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()

  const {events, result} = await renderContext()
  await waitFor(() => expect(events.activeText()).toBe('첫 대사'))
  expect(events.activeSegmentCount()).toBe(2)
  expect(events.activeSegmentPosition()).toBe(0)

  audio.currentTime = 1
  frameCallback?.(0)
  expect(events.activeText()).toBe('두 번째 대사')
  expect(events.activeSegmentPosition()).toBe(1)
  result.unmount()
})

it('should append feed playback behind active event dialogues', async () => {
  const dialogues = [
    createDialogue('event-first'),
    createDialogue('event-second'),
    createDialogue('feed'),
  ]
  const repository = createRepository(dialogues, [
    {dialogueIds: ['event-first', 'event-second'], event: 'focus-end', version: 2},
  ])
  const audioElements = dialogues.map(() => document.createElement('audio'))
  let audioIndex = 0
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audio = audioElements[audioIndex]
      audioIndex += 1
      return audio
    }),
  )
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()

  const eventPlayback = events.playDialogueEvents(['focus-end'])
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event-first'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  const feedPlayback = events.playDialogue('feed')
  expect(repository.getDialogue).not.toHaveBeenCalledWith('feed')
  await waitFor(() => expect(events.isDialogueScheduled('feed')).toBe(true))

  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event-second'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('feed'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(3))
  audioElements[2]?.dispatchEvent(new Event('ended'))
  await Promise.all([eventPlayback, feedPlayback])

  expect(repository.getDialogue.mock.calls).toEqual([['event-first'], ['event-second'], ['feed']])
  result.unmount()
})

it('should queue every dialogue from simultaneous pomodoro events', async () => {
  const dialogues = [createDialogue('focus-end'), createDialogue('break-start')]
  const repository = createRepository(dialogues, [
    {dialogueIds: ['focus-end'], event: 'focus-end', version: 2},
    {dialogueIds: ['break-start'], event: 'break-start', version: 2},
  ])
  const audioElements = dialogues.map(() => document.createElement('audio'))
  let audioIndex = 0
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audio = audioElements[audioIndex]
      audioIndex += 1
      return audio
    }),
  )
  const playAudio = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()
  const onBeforePlayback = vi.fn()

  const playback = events.playDialogueEvents(['focus-end', 'break-start'], onBeforePlayback)
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('focus-end'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(1))
  expect(onBeforePlayback).toHaveBeenCalledOnce()
  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('break-start'))
  await waitFor(() => expect(playAudio).toHaveBeenCalledTimes(2))
  audioElements[1]?.dispatchEvent(new Event('ended'))
  await playback

  expect(repository.getDialogue.mock.calls).toEqual([['focus-end'], ['break-start']])
  result.unmount()
})

it('should notify the entire queued feed batch when the user stops playback', async () => {
  const dialogues = [
    createDialogue('event'),
    createDialogue('feed-first'),
    createDialogue('feed-second'),
  ]
  const repository = createRepository(dialogues)
  const audio = document.createElement('audio')
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      return audio
    }),
  )
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  const {events, result} = await renderContext()

  const eventPlayback = events.playDialogue('event')
  await waitFor(() => expect(repository.getDialogue).toHaveBeenCalledWith('event'))
  const onSequenceStop = vi.fn(async () => undefined)
  const feedIds = ['feed-first', 'feed-second']
  const feedPlayback = events.playDialogueSequence({
    dialogueIds: feedIds,
    onDialogueStart: vi.fn(),
    onSequenceStop,
  })
  events.onStopDialoguePlayback()
  await Promise.all([eventPlayback, feedPlayback])

  expect(repository.getDialogue).not.toHaveBeenCalledWith('feed-first')
  expect(onSequenceStop).toHaveBeenCalledWith(feedIds)
  result.unmount()
})

it('should roll back only the latest failed event binding update', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  const repository = createRepository(dialogues)
  repository.setEventBinding.mockResolvedValueOnce(undefined)
  repository.setEventBinding.mockRejectedValueOnce(new Error('database unavailable'))
  repositoryMocks.create.mockReturnValue(repository)
  const {events, result} = await renderContext()

  await events.setEventDialogues('room-enter', ['first'])
  await expect(events.setEventDialogues('room-enter', ['second'])).rejects.toThrow(
    'database unavailable',
  )

  expect(events.entryDialogueIds()).toEqual(['first'])
  result.unmount()
})

it('should refresh event bindings changed by another repository owner', async () => {
  const dialogues = [createDialogue('first'), createDialogue('second')]
  let storedDialogues: ReadonlyArray<FocusRoomDialogue> = dialogues
  let storedBindings: ReadonlyArray<DialogueEventBinding> = [
    {dialogueIds: ['first', 'second'], event: 'room-enter', version: 2},
  ]
  const repository = {
    ...createRepository(dialogues),
    listDialogues: vi.fn(async () => storedDialogues),
    listEventBindings: vi.fn(async () => storedBindings),
  }
  repositoryMocks.create.mockReturnValue(repository)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(
    new DOMException('Autoplay blocked', 'NotAllowedError'),
  )
  const {events, result} = await renderContext()

  expect(events.entryDialogueIds()).toEqual(['first', 'second'])
  storedDialogues = [dialogues[1]].filter((dialogue) => dialogue !== undefined)
  storedBindings = [{dialogueIds: ['second'], event: 'room-enter', version: 2}]
  await events.refreshDialogues()

  expect(events.dialogues().map((dialogue) => dialogue.id)).toEqual(['second'])
  expect(events.entryDialogueIds()).toEqual(['second'])
  result.unmount()
})
