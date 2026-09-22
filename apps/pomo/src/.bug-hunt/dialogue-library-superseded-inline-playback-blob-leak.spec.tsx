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
  activeSegmentPosition: () => null,
  activeText: () => null,
  activeViseme: () => 'rest',
  cancelDelayedEndEvent: vi.fn(),
  delayedEndEventDurationMinutes: () => 30,
  delayedEndEventIsRunning: () => false,
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: () => [DIALOGUE],
  enterFocusRoom: vi.fn(),
  entryDialogueId: () => null,
  entryDialogueIds: () => [],
  errorMessage: () => null,
  eventActionIds: () => ({}),
  eventDialogueIds: () => ({}),
  eventPlaybackModes: () => ({}),
  getAudio: vi.fn(async () => null),
  hasEnteredFocusRoom: () => true,
  isDialoguePlaybackBlocked: () => false,
  isDialoguePlaying: () => false,
  isDialogueScheduled: () => false,
  isEntryPlaybackBlocked: () => false,
  isLoading: () => false,
  onStopDialoguePlayback: vi.fn(),
  onStopEntryPlayback: vi.fn(),
  playDialogue: vi.fn(async () => true),
  playDialogueEvents: vi.fn(async () => undefined),
  playDialogueSequence: vi.fn(async () => undefined),
  refreshDialogues: vi.fn(async () => undefined),
  registerEventActionExecutor: vi.fn(() => vi.fn()),
  retryDialoguePlayback: vi.fn(),
  retryEntryPlayback: vi.fn(),
  scheduledDialogueCount: () => 0,
  setDelayedEndEventDuration: vi.fn(async () => undefined),
  setEntryDialogue: vi.fn(async () => undefined),
  setEntryDialogues: vi.fn(async () => undefined),
  setEventDialogue: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  setEventItems: vi.fn(async () => undefined),
  setEventPlaybackMode: vi.fn(async () => undefined),
  skipDialoguePlayback: vi.fn(),
  startDelayedEndEvent: vi.fn(),
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(usePEvents).mockReturnValue(createEvents())
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should revoke a superseded inline playback blob after object URL creation', async () => {
  const secondAudio = Promise.withResolvers<Blob>()
  const events = createEvents()
  vi.mocked(events.getAudio)
    .mockResolvedValueOnce(new Blob(['first audio']))
    .mockImplementationOnce(() => secondAudio.promise)
  vi.mocked(usePEvents).mockReturnValue(events)

  const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    if (createObjectURL.mock.calls.length === 1) {
      fireEvent.click(screen.getAllByRole('button', {name: '듣기'})[1]!)
    }

    return `blob:dialogue-${createObjectURL.mock.calls.length}`
  })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)

  render(() => <DialogueLibrary entries={[{dialogue: DIALOGUE}, {dialogue: SECOND_DIALOGUE}]} />)

  fireEvent.click(screen.getAllByRole('button', {name: '듣기'})[0]!)
  await vi.waitFor(() => expect(events.getAudio).toHaveBeenCalledTimes(2))

  expect(revokeObjectURL).toHaveBeenCalledWith('blob:dialogue-1')

  secondAudio.resolve(new Blob(['second audio']))
  await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(2))
})
