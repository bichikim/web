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

const MULTI_SEGMENT_DIALOGUE: FocusRoomDialogue = {
  ...DIALOGUE,
  durationMs: 1800,
  segments: [
    {durationMs: 500, index: 0, startMs: 0, text: '첫 대사'},
    {durationMs: 1000, index: 1, startMs: 800, text: '두 번째 대사'},
  ],
  text: '첫 대사\n두 번째 대사',
}

const BREAK_DIALOGUE: FocusRoomDialogue = {
  ...DIALOGUE,
  audioKey: 'break-audio',
  id: 'break-dialogue',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '휴식 시작 대사'}],
  text: '휴식 시작 대사',
}

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
    listDialogues: vi.fn(async () => [DIALOGUE]),
    listEventBindings: vi.fn(async () => [
      {
        dialogueId: DIALOGUE.id,
        event: 'room-enter' as const,
        version: 1 as const,
      },
    ]),
    saveDialogue: vi.fn(),
    setEventBinding: vi.fn(),
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
  expect(events.activeSegmentCount()).toBe(0)
  expect(events.activeSegmentPosition()).toBeNull()
  expect(events.isDialoguePlaybackBlocked()).toBe(false)

  result.unmount()
  expect(repository.dispose).toHaveBeenCalledOnce()
})

it('should expose the active segment position while entry audio advances', async () => {
  const audio = document.createElement('audio')
  const removeListener = vi.spyOn(audio, 'removeEventListener')
  let frameCallback: FrameRequestCallback | undefined
  const repository = {
    deleteDialogue: vi.fn(),
    dispose: vi.fn(),
    getAudio: vi.fn(async () => new Blob(['audio'])),
    getDialogue: vi.fn(async () => MULTI_SEGMENT_DIALOGUE),
    listDialogues: vi.fn(async () => [MULTI_SEGMENT_DIALOGUE]),
    listEventBindings: vi.fn(async () => [
      {
        dialogueId: MULTI_SEGMENT_DIALOGUE.id,
        event: 'room-enter' as const,
        version: 1 as const,
      },
    ]),
    saveDialogue: vi.fn(),
    setEventBinding: vi.fn(),
  }
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

  await waitFor(() => expect(eventReference.current?.activeText()).toBe('첫 대사'))
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  expect(events.activeSegmentCount()).toBe(2)
  expect(events.activeSegmentPosition()).toBe(0)
  audio.currentTime = 0.8
  frameCallback?.(0)
  expect(events.activeText()).toBe('두 번째 대사')
  expect(events.activeSegmentPosition()).toBe(1)

  result.unmount()
  expect(removeListener).toHaveBeenCalledWith('ended', expect.any(Function))
})

it('should queue dialogues when one pomodoro transition emits end and start events', async () => {
  const audioElements: Array<HTMLAudioElement> = []
  let resolveBindings: (
    bindings: ReadonlyArray<{
      readonly dialogueId: string
      readonly event: 'break-start' | 'focus-end'
      readonly version: 1
    }>,
  ) => void = () => undefined
  const bindings = new Promise<
    ReadonlyArray<{
      readonly dialogueId: string
      readonly event: 'break-start' | 'focus-end'
      readonly version: 1
    }>
  >((resolve) => {
    resolveBindings = resolve
  })
  const repository = {
    deleteDialogue: vi.fn(),
    dispose: vi.fn(),
    getAudio: vi.fn(async () => new Blob(['audio'])),
    getDialogue: vi.fn(async (dialogueId: string) =>
      dialogueId === DIALOGUE.id ? DIALOGUE : BREAK_DIALOGUE,
    ),
    listDialogues: vi.fn(async () => [DIALOGUE, BREAK_DIALOGUE]),
    listEventBindings: vi.fn(() => bindings),
    saveDialogue: vi.fn(),
    setEventBinding: vi.fn(),
  }
  repositoryMocks.create.mockReturnValue(repository)
  vi.stubGlobal(
    'Audio',
    vi.fn(function AudioMock() {
      const audio = document.createElement('audio')
      audioElements.push(audio)
      return audio
    }),
  )
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
  const events = eventReference.current

  if (events === undefined) {
    throw new Error('Expected the focus room event context to be captured.')
  }

  const onBeforePlayback = vi.fn()
  const playback = events.playDialogueEvents(['focus-end', 'break-start'], onBeforePlayback)
  expect(onBeforePlayback).not.toHaveBeenCalled()
  resolveBindings([
    {dialogueId: DIALOGUE.id, event: 'focus-end', version: 1},
    {dialogueId: BREAK_DIALOGUE.id, event: 'break-start', version: 1},
  ])
  await playback
  expect(onBeforePlayback).toHaveBeenCalledOnce()
  expect(events.activeText()).toBe('입장 대사')
  expect(audioElements).toHaveLength(1)

  audioElements[0]?.dispatchEvent(new Event('ended'))
  await waitFor(() => expect(events.activeText()).toBe('휴식 시작 대사'))
  expect(audioElements).toHaveLength(2)
  result.unmount()
})
