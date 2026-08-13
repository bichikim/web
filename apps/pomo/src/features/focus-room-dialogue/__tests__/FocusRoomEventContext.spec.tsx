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
      dialogueId: DIALOGUE.id,
      event: 'room-enter' as const,
      version: 1 as const,
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
  expect(events.activeSegmentCount()).toBe(0)
  expect(events.activeSegmentPosition()).toBeNull()
  expect(events.isEntryPlaybackBlocked()).toBe(false)

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
    getEntryBinding: vi.fn(async () => ({
      dialogueId: MULTI_SEGMENT_DIALOGUE.id,
      event: 'room-enter' as const,
      version: 1 as const,
    })),
    listDialogues: vi.fn(async () => [MULTI_SEGMENT_DIALOGUE]),
    saveDialogue: vi.fn(),
    setEntryBinding: vi.fn(),
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
