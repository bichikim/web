/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {type PEventContextValue} from '../features/focus-room-dialogue'

const eventMocks = vi.hoisted(() => ({usePEvents: vi.fn()}))

vi.mock('../features/focus-room-dialogue', async () => {
  const actual = await vi.importActual<typeof import('../features/focus-room-dialogue')>(
    '../features/focus-room-dialogue',
  )

  return {...actual, usePEvents: eventMocks.usePEvents}
})

import {DelayedEndEventSettings} from '../components/dialogue-settings/DelayedEndEventSettings'

const originalGetLocale = getLocale

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

beforeEach(() => {
  vi.clearAllMocks()
  overwriteGetLocale(() => 'ko')
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should accept fullwidth digits pasted into the delayed-end duration field', async () => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)
  vi.useFakeTimers()

  try {
    render(() => <DelayedEndEventSettings />)
    const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})

    fireEvent.input(input, {target: {value: '３０'}})

    expect(screen.queryByText('대기 시간은 1~120분 사이의 정수여야 해요.')).toBeNull()
    expect(screen.getByRole('button', {name: '시작'})).not.toBeDisabled()

    await vi.advanceTimersByTimeAsync(500)
    expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(30)
  } finally {
    vi.useRealTimers()
  }
})
