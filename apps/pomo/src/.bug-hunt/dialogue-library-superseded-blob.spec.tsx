/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type PDialogue,
  type PEventContextValue,
  usePEvents,
} from '../features/focus-room-dialogue'
import {DialogueLibrary} from '../components/dialogue-settings/Library'

vi.mock('@solidjs/router', () => ({
  A: (props: {readonly children?: JSX.Element; readonly href: string}) => (
    <a href={props.href}>{props.children}</a>
  ),
}))
vi.mock('../features/focus-room-dialogue', async () => {
  const actual: typeof import('../features/focus-room-dialogue') = await vi.importActual(
    '../features/focus-room-dialogue',
  )

  return {...actual, usePEvents: vi.fn()}
})

const DIALOGUE: PDialogue = {
  audioKey: 'audio-dialogue-1',
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'full',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const SECOND_DIALOGUE = {
  ...DIALOGUE,
  audioKey: 'audio-dialogue-2',
  id: 'dialogue-2',
} satisfies PDialogue

const createEvents = (overrides: Partial<PEventContextValue> = {}): PEventContextValue => ({
  activeDialogueId: () => null,
  activeSegmentCount: () => 0,
  activeSegmentMood: () => null,
  delayedEndEventDurationMinutes: () => 30,
  delayedEndEventIsRunning: () => false,
  dialogues: () => [],
  entryDialogueId: () => null,
  entryDialogueIds: () => [],
  errorMessage: () => null,
  eventActionIds: () => ({}),
  eventDialogueIds: () => ({}),
  eventPlaybackModes: () => ({}),
  getAudio: vi.fn(async () => new Blob(['audio'])),
  isLoading: () => false,
  playDialogue: vi.fn(async () => true),
  playDialogueEvents: vi.fn(async () => undefined),
  registerBeforePlayback: vi.fn(() => () => undefined),
  registerEventActionExecutor: vi.fn(() => () => undefined),
  scheduledDialogueCount: () => 0,
  setDelayedEndEventDurationMinutes: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  setEventItems: vi.fn(async () => undefined),
  setEventPlaybackMode: vi.fn(async () => undefined),
  startDelayedEndEvent: vi.fn(),
  stopDialogue: vi.fn(),
  waitForInitialization: async () => undefined,
  ...overrides,
})

beforeEach(() => {
  vi.mocked(usePEvents).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should revoke the blob URL when a superseded inline playback request finishes preparing', async () => {
  const secondAudio = Promise.withResolvers<Blob>()
  const events = createEvents()
  vi.mocked(events.getAudio)
    .mockResolvedValueOnce(new Blob(['first audio']))
    .mockImplementationOnce(() => secondAudio.promise)
  vi.mocked(usePEvents).mockReturnValue(events)

  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  render(() => <DialogueLibrary entries={[{dialogue: DIALOGUE}, {dialogue: SECOND_DIALOGUE}]} />)
  const listenButtons = screen.getAllByRole('button', {name: '듣기'})
  let didReplaceRequest = false
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    if (!didReplaceRequest) {
      didReplaceRequest = true
      fireEvent.click(listenButtons[1]!)
    }

    return 'blob:superseded'
  })

  fireEvent.click(listenButtons[0]!)
  await vi.waitFor(() => expect(events.getAudio).toHaveBeenCalledTimes(2))

  secondAudio.resolve(new Blob(['second audio']))
  await vi.waitFor(() => expect(HTMLMediaElement.prototype.play).toHaveBeenCalled())

  expect(revokeUrl).toHaveBeenCalledWith('blob:superseded')
})
