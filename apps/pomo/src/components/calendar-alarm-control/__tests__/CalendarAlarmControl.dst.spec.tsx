/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {CalendarEvent} from '../../../features/calendar'
import type {MemoryMemo} from '../../../features/memory-assist'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

interface ButtonProps {
  readonly accessibleLabel?: string
  readonly children: JSX.Element
  readonly disabled?: boolean
  readonly onPress?: () => void
}

interface AlarmInput {
  readonly date: string
  readonly now: string
  readonly time: string
  readonly timeZone: string
}

const mocks = vi.hoisted(() => ({
  button: vi.fn<(props: ButtonProps) => JSX.Element>(),
  deleteAudio: vi.fn(),
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  updateMemos: vi.fn(),
  usePEvents: vi.fn(),
}))

vi.mock('../../../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: mocks.deleteAudio,
  usePEvents: mocks.usePEvents,
}))
vi.mock('../../../features/memory-assist/repository', async () => {
  const actual = await vi.importActual('../../../features/memory-assist/repository')
  return {
    ...actual,
    readMemoryMemos: async () => mocks.memos,
    updateMemoryMemos: mocks.updateMemos,
  }
})
vi.mock('../../p-button/PButton', () => ({
  PButton: mocks.button,
}))

const event: CalendarEvent = {
  accountLabel: 'person@example.com',
  allDay: true,
  calendarLabel: '업무',
  end: '2026-09-06',
  id: 'connection-1:event-1',
  provider: 'google',
  start: '2026-09-05',
  title: '팀 회의',
}
const matches = HTMLElement.prototype.matches

beforeEach(() => {
  vi.clearAllMocks()
  mocks.usePEvents.mockReturnValue({deleteDialogue: mocks.deleteDialogue})
  mocks.button.mockImplementation((props) => (
    <button aria-label={props.accessibleLabel} disabled={props.disabled} onClick={props.onPress}>
      {props.children}
    </button>
  ))
  mocks.deleteAudio.mockResolvedValue(undefined)
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.memos = []
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
  localStorage.clear()
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'matches', {
    configurable: true,
    value(this: HTMLElement, selector: string) {
      return selector === ':popover-open' ? false : matches.call(this, selector)
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

const submitAlarm = ({date, now, time, timeZone}: AlarmInput) => {
  render(() => (
    <CalendarAlarmControl
      now={() => new Date(now)}
      event={event}
      memos={() => mocks.memos}
      timeZone={timeZone}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: date}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: time}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
}

it.each([
  {
    date: '2026-03-08',
    now: '2026-03-08T04:00:00.000Z',
    time: '02:30',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-10-04',
    now: '2026-10-03T12:00:00.000Z',
    time: '02:15',
    timeZone: 'Australia/Lord_Howe',
  },
])(
  'should reject a nonexistent $time wall time in $timeZone',
  async ({date, now, time, timeZone}) => {
    submitAlarm({date, now, time, timeZone})

    expect(mocks.updateMemos).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent(
      '현재보다 뒤의 날짜와 시간을 선택해 주세요.',
    )
    expect(localStorage.getItem('pomo:memory-memos:v1')).toBeNull()
    expect(mocks.deleteDialogue).not.toHaveBeenCalled()
    expect(mocks.deleteAudio).not.toHaveBeenCalled()
  },
)

it.each([
  {
    date: '2026-03-08',
    expected: '2026-03-08T06:59:00.000Z',
    now: '2026-03-08T04:00:00.000Z',
    time: '01:59',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-03-08',
    expected: '2026-03-08T07:00:00.000Z',
    now: '2026-03-08T04:00:00.000Z',
    time: '03:00',
    timeZone: 'America/New_York',
  },
  {
    date: '2026-10-04',
    expected: '2026-10-03T15:29:00.000Z',
    now: '2026-10-03T12:00:00.000Z',
    time: '01:59',
    timeZone: 'Australia/Lord_Howe',
  },
  {
    date: '2026-10-04',
    expected: '2026-10-03T15:30:00.000Z',
    now: '2026-10-03T12:00:00.000Z',
    time: '02:30',
    timeZone: 'Australia/Lord_Howe',
  },
])(
  'should save the valid $time wall-time boundary on $date in $timeZone',
  async ({date, expected, now, time, timeZone}) => {
    submitAlarm({date, now, time, timeZone})

    await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
    expect(mocks.memos[0]?.exactReminderAt).toBe(expected)
  },
)

it('should preserve the existing earlier-instance choice for a fall-back wall time', async () => {
  submitAlarm({
    date: '2026-11-01',
    now: '2026-11-01T04:00:00.000Z',
    time: '01:30',
    timeZone: 'America/New_York',
  })

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]?.exactReminderAt).toBe('2026-11-01T05:30:00.000Z')
})
