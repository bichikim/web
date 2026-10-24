import {type JSX} from 'solid-js'
import {afterEach, beforeEach, vi} from 'vitest'
import type {CalendarEvent} from '../../../../features/calendar'
import {createMemoryMemo, type MemoryMemo} from '../../../../features/memory-assist'

interface ButtonProps {
  readonly accessibleLabel?: string
  readonly children: JSX.Element
  readonly disabled?: boolean
  readonly onPress?: () => void
}

const mocks = vi.hoisted(() => ({
  button: vi.fn<(props: ButtonProps) => JSX.Element>(),
  deleteAudio: vi.fn(),
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  updateMemos: vi.fn(),
  usePEvents: vi.fn(),
}))

export {mocks}

vi.mock('../../../../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: mocks.deleteAudio,
  usePEvents: mocks.usePEvents,
}))
vi.mock('../../../../features/memory-assist/repository', async () => {
  const actual = await vi.importActual('../../../../features/memory-assist/repository')
  return {
    ...actual,
    readMemoryMemos: async () => mocks.memos,
    updateMemoryMemos: mocks.updateMemos,
  }
})
vi.mock('../../../p-button/PButton', () => ({
  PButton: mocks.button,
}))

export const event: CalendarEvent = {
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-09-06',
  id: 'connection-1:event-1',
  provider: 'google',
  start: '2026-09-05',
  title: '팀 회의',
}
export const HOST_DEFAULT_ALARM_AT = new Date('2026-09-06T09:00:00')
export const HOST_SAVED_ALARM_AT = new Date('2026-09-06T08:30:00')
export const CALENDAR_TIME_ZONE =
  HOST_SAVED_ALARM_AT.toISOString() === '2026-09-06T15:30:00.000Z'
    ? 'Asia/Seoul'
    : 'America/Los_Angeles'
export const EXPECTED_DEFAULT_ALARM_AT =
  CALENDAR_TIME_ZONE === 'Asia/Seoul' ? '2026-09-06T00:00:00.000Z' : '2026-09-06T16:00:00.000Z'
export const EXPECTED_SAVED_ALARM_AT =
  CALENDAR_TIME_ZONE === 'Asia/Seoul' ? '2026-09-05T23:30:00.000Z' : '2026-09-06T15:30:00.000Z'
export const clock = {current: new Date('2026-09-04T03:00:00.000Z')}
export const now = () => new Date(clock.current)
const {matches} = HTMLElement.prototype

const setPopoverState = (popover: HTMLElement, newState: 'open' | 'closed') => {
  const oldState = popover.dataset.testPopoverOpen === 'true' ? 'open' : 'closed'
  if (oldState === newState) {
    return
  }

  popover.dataset.testPopoverOpen = String(newState === 'open')
  const toggle = new Event('toggle')
  Object.defineProperties(toggle, {
    newState: {value: newState},
    oldState: {value: oldState},
  })
  popover.dispatchEvent(toggle)
}

export const ownedAlarm = () => ({
  ...createMemoryMemo({
    exactReminderAt: '2026-09-05T09:00:00.000Z',
    id: 'calendar-alarm:connection-1:event-1',
    now: now(),
    random: () => 0,
    recallMode: 'none',
    text: '팀 회의 일정 알람이에요.',
  }),
  dialogueId: 'memory-memo-calendar-alarm:connection-1:event-1',
})

export const setupCalendarAlarmControl = () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.usePEvents.mockReturnValue({deleteDialogue: mocks.deleteDialogue})
    mocks.button.mockImplementation((props) => (
      <button
        aria-label={props.accessibleLabel}
        disabled={props.disabled}
        onClick={() => props.onPress?.()}
      >
        {props.children}
      </button>
    ))
    clock.current = new Date('2026-09-04T03:00:00.000Z')
    localStorage.clear()
    mocks.deleteAudio.mockResolvedValue(undefined)
    mocks.memos = []
    mocks.deleteDialogue.mockResolvedValue(undefined)
    mocks.updateMemos.mockImplementation(async (update) => {
      mocks.memos = update(mocks.memos)
      return mocks.memos
    })
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      value: vi.fn(function hidePopover(this: HTMLElement) {
        setPopoverState(this, 'closed')
      }),
    })
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(function showPopover(this: HTMLElement) {
        setPopoverState(this, 'open')
      }),
    })
    Object.defineProperty(HTMLElement.prototype, 'matches', {
      configurable: true,
      value(this: HTMLElement, selector: string) {
        return selector === ':popover-open'
          ? this.dataset.testPopoverOpen === 'true'
          : matches.call(this, selector)
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(HTMLElement.prototype, 'matches', {
      configurable: true,
      value: matches,
    })
  })
}
