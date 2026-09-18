/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {DelayedEndEventSettings} from '../components/dialogue-settings/DelayedEndEventSettings'
import {type PEventContextValue, usePEvents} from '../features/focus-room-dialogue'

const eventMocks = vi.hoisted(() => ({usePEvents: vi.fn()}))

vi.mock('../features/focus-room-dialogue', async () => {
  const actual = await vi.importActual<typeof import('../features/focus-room-dialogue')>(
    '../features/focus-room-dialogue',
  )

  return {...actual, usePEvents: eventMocks.usePEvents}
})

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
  dialogues: () => [],
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

it('should arm the delayed-end timer with the duration shown in the input after a failed save rollback', async () => {
  let durationMinutes = 30
  const capturedDuration = vi.fn()
  const events = createEvents({
    delayedEndEventDurationMinutes: () => durationMinutes,
    setDelayedEndEventDuration: vi.fn(async (nextDuration: number) => {
      durationMinutes = nextDuration
      throw new Error('storage unavailable')
    }),
    startDelayedEndEvent: () => {
      capturedDuration(durationMinutes)
    },
  })
  eventMocks.usePEvents.mockReturnValue(events)

  render(() => <DelayedEndEventSettings />)
  const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})
  fireEvent.input(input, {target: {value: '45'}})

  await vi.waitFor(() => expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(45))
  durationMinutes = 30

  fireEvent.click(screen.getByRole('button', {name: '시작'}))

  expect(capturedDuration).toHaveBeenCalledWith(45)
})
