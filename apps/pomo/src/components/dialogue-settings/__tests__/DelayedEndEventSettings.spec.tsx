/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {type PEventContextValue} from '../../../features/focus-room-dialogue'

const eventMocks = vi.hoisted(() => ({usePEvents: vi.fn()}))

vi.mock('../../../features/focus-room-dialogue', async () => {
  const actual = await vi.importActual<typeof import('../../../features/focus-room-dialogue')>(
    '../../../features/focus-room-dialogue',
  )

  return {...actual, usePEvents: eventMocks.usePEvents}
})

import {DelayedEndEventSettings} from '../DelayedEndEventSettings'

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
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
})

it('should render the waiting-time unit in English', () => {
  overwriteGetLocale(() => 'en')
  eventMocks.usePEvents.mockReturnValue(createEvents())

  render(() => <DelayedEndEventSettings />)

  expect(screen.getByText('Time (minutes)')).toBeInTheDocument()
  expect(screen.getByText('min')).toBeInTheDocument()
  expect(screen.queryByText('분')).toBeNull()
})

it('should show concise context for the waiting time', () => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)

  render(() => <DelayedEndEventSettings />)

  expect(screen.getByText('시작 후 종료까지 기다리는 시간이에요.')).toBeInTheDocument()
  expect(screen.getByText('시간(분)')).toBeInTheDocument()
})

it('should wait for a complete multi-digit waiting time before saving', async () => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)
  vi.useFakeTimers()

  try {
    render(() => <DelayedEndEventSettings />)
    const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})

    fireEvent.input(input, {target: {value: '9'}})
    expect(events.setDelayedEndEventDuration).not.toHaveBeenCalledWith(9)

    fireEvent.input(input, {target: {value: '90'}})
    await vi.advanceTimersByTimeAsync(499)
    expect(events.setDelayedEndEventDuration).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(events.setDelayedEndEventDuration).toHaveBeenCalledOnce()
    expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(90)
  } finally {
    vi.useRealTimers()
  }
})

it.each([
  {label: 'minimum duration', minutes: 1, pasted: '１'},
  {label: 'default duration', minutes: 30, pasted: '３０'},
  {label: 'maximum duration', minutes: 120, pasted: '１２０'},
])('should accept fullwidth paste for the $label', async ({minutes, pasted}) => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)
  const user = userEvent.setup()
  render(() => <DelayedEndEventSettings />)
  const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})

  await user.clear(input)
  await user.paste(pasted)

  expect(input).toHaveValue(pasted)
  expect(screen.queryByText('대기 시간은 1~120분 사이의 정수여야 해요.')).toBeNull()
  const startButton = screen.getByRole('button', {name: '시작'})
  expect(startButton).not.toBeDisabled()

  await user.click(startButton)

  expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(minutes)
  expect(events.startDelayedEndEvent).toHaveBeenCalledOnce()
})

it.each(['０', '１２１', '１.５'])(
  'should reject invalid fullwidth duration %s after paste',
  async (pasted) => {
    const events = createEvents()
    eventMocks.usePEvents.mockReturnValue(events)
    const user = userEvent.setup()
    render(() => <DelayedEndEventSettings />)
    const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})

    await user.clear(input)
    await user.paste(pasted)

    expect(input).toHaveValue(pasted)
    expect(screen.getByText('대기 시간은 1~120분 사이의 정수여야 해요.')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '시작'})).toBeDisabled()
    expect(events.setDelayedEndEventDuration).not.toHaveBeenCalled()
    expect(events.startDelayedEndEvent).not.toHaveBeenCalled()
  },
)

it('should keep ArrowUp incrementing the waiting time after paste support is enabled', async () => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)
  const user = userEvent.setup()
  render(() => <DelayedEndEventSettings />)
  const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})

  await user.click(input)
  await user.keyboard('{ArrowUp}')

  expect(input).toHaveValue('31')
  expect(screen.getByRole('button', {name: '시작'})).not.toBeDisabled()

  await user.click(screen.getByRole('button', {name: '시작'}))

  expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(31)
  expect(events.startDelayedEndEvent).toHaveBeenCalledOnce()
})

it('should use the latest waiting time when starting before the save debounce completes', () => {
  const [duration, setDuration] = createSignal(30)
  let startedWithDuration: number | null = null
  const events = createEvents({
    delayedEndEventDurationMinutes: duration,
    setDelayedEndEventDuration: vi.fn(async (nextDuration: number) => {
      setDuration(nextDuration)
    }),
    startDelayedEndEvent: vi.fn(() => {
      startedWithDuration = duration()
    }),
  })
  eventMocks.usePEvents.mockReturnValue(events)
  vi.useFakeTimers()

  try {
    render(() => <DelayedEndEventSettings />)
    fireEvent.input(screen.getByRole('spinbutton', {name: '대기 시간(분)'}), {
      target: {value: '90'},
    })

    fireEvent.click(screen.getByRole('button', {name: '시작'}))

    expect(startedWithDuration).toBe(90)
    expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(90)
  } finally {
    vi.useRealTimers()
  }
})

it('should synchronize an externally changed waiting time after saving', async () => {
  const [duration, setDuration] = createSignal(30)
  const save = Promise.withResolvers<void>()
  const events = createEvents({
    delayedEndEventDurationMinutes: duration,
    setDelayedEndEventDuration: vi.fn(() => save.promise),
  })
  eventMocks.usePEvents.mockReturnValue(events)
  vi.useFakeTimers()

  try {
    render(() => <DelayedEndEventSettings />)
    const input = screen.getByRole('spinbutton', {name: '대기 시간(분)'})

    fireEvent.input(input, {target: {value: '45'}})
    await vi.advanceTimersByTimeAsync(500)
    expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(45)

    save.resolve()
    await save.promise
    setDuration(60)

    await vi.waitFor(() => expect(input).toHaveValue('60'))
  } finally {
    vi.useRealTimers()
  }
})

it('should flush a pending waiting time when the settings unmount', () => {
  const events = createEvents()
  eventMocks.usePEvents.mockReturnValue(events)
  vi.useFakeTimers()

  try {
    const view = render(() => <DelayedEndEventSettings />)
    fireEvent.input(screen.getByRole('spinbutton', {name: '대기 시간(분)'}), {
      target: {value: '90'},
    })

    view.unmount()

    expect(events.setDelayedEndEventDuration).toHaveBeenCalledWith(90)
  } finally {
    vi.useRealTimers()
  }
})

it('should hide status and helper descriptions while waiting', () => {
  const events = createEvents({delayedEndEventIsRunning: () => true})
  eventMocks.usePEvents.mockReturnValue(events)

  render(() => <DelayedEndEventSettings />)

  expect(screen.getByRole('button', {name: '중지'})).toBeInTheDocument()
  expect(screen.queryByText('실행 대기 중')).toBeNull()
  expect(screen.getByText('분')).toBeInTheDocument()
  expect(screen.queryByText('지정 시간 후 종료 대기 시간(분)')).toBeNull()
  expect(
    screen.queryByText('시작 버튼을 누른 뒤 지정한 시간이 지나면 연결한 대화와 행동을 실행해요.'),
  ).toBeNull()
})

it('should cancel only while the timer is running and start again after it expires', () => {
  const [isRunning, setIsRunning] = createSignal(false)
  const startDelayedEndEvent = vi.fn(() => setIsRunning(true))
  const cancelDelayedEndEvent = vi.fn(() => setIsRunning(false))
  const events = createEvents({
    cancelDelayedEndEvent,
    delayedEndEventIsRunning: isRunning,
    startDelayedEndEvent,
  })
  eventMocks.usePEvents.mockReturnValue(events)

  render(() => <DelayedEndEventSettings />)

  fireEvent.click(screen.getByRole('button', {name: '시작'}))
  expect(startDelayedEndEvent).toHaveBeenCalledOnce()
  expect(cancelDelayedEndEvent).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', {name: '중지'}))
  expect(cancelDelayedEndEvent).toHaveBeenCalledOnce()
  expect(startDelayedEndEvent).toHaveBeenCalledOnce()

  fireEvent.click(screen.getByRole('button', {name: '시작'}))
  expect(startDelayedEndEvent).toHaveBeenCalledTimes(2)

  // Timer expiry clears the running state without invoking the button's cancel path.
  setIsRunning(false)
  fireEvent.click(screen.getByRole('button', {name: '시작'}))

  expect(startDelayedEndEvent).toHaveBeenCalledTimes(3)
  expect(cancelDelayedEndEvent).toHaveBeenCalledOnce()
})
