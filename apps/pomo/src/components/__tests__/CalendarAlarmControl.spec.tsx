/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {CalendarEvent} from '../../features/calendar'
import {
  advanceMemoryMemo,
  createMemoryMemo,
  getDueMemoryReminder,
  type MemoryMemo,
} from '../../features/memory-assist'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

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

vi.mock('../../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: mocks.deleteAudio,
  usePEvents: mocks.usePEvents,
}))
vi.mock('../../features/memory-assist/repository', async () => {
  const actual = await vi.importActual('../../features/memory-assist/repository')
  return {
    ...actual,
    readMemoryMemos: async () => mocks.memos,
    updateMemoryMemos: mocks.updateMemos,
  }
})
vi.mock('../PButton', () => ({
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
let currentTime = new Date('2026-09-04T03:00:00.000Z')
const now = () => new Date(currentTime)
const matches = HTMLElement.prototype.matches

beforeEach(() => {
  vi.clearAllMocks()
  mocks.usePEvents.mockReturnValue({deleteDialogue: mocks.deleteDialogue})
  mocks.button.mockImplementation((props) => (
    <button aria-label={props.accessibleLabel} disabled={props.disabled} onClick={props.onPress}>
      {props.children}
    </button>
  ))
  currentTime = new Date('2026-09-04T03:00:00.000Z')
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

it('should preserve the all-day event date when no selected date is provided', () => {
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
  expect(screen.getByLabelText('시간')).toHaveValue('09:00')
})

it('should default a spanning all-day alarm to the selected calendar day', () => {
  const spanningEvent: CalendarEvent = {
    ...event,
    end: '2026-09-07',
    start: '2026-09-05',
  }
  render(() => (
    <CalendarAlarmControl
      now={now}
      defaultAlarmDate={new Date(2026, 8, 6)}
      event={spanningEvent}
      memos={() => mocks.memos}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-06')
  expect(screen.getByLabelText('시간')).toHaveValue('09:00')
})

it('should save an exact Pomo reminder for a calendar event', async () => {
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByRole('dialog', {name: '일정 알람'})).toHaveAttribute('popover', 'auto')
  const dateInput = screen.getByLabelText('날짜')
  const timeInput = screen.getByLabelText('시간')
  expect(dateInput).toHaveValue('2026-09-05')
  expect(timeInput).toHaveValue('09:00')
  expect(dateInput.parentElement?.parentElement).toHaveClass('grid-cols-1')
  expect(dateInput).toHaveClass('min-w-0')
  expect(timeInput).toHaveClass('min-w-0')
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: '2026-09-06'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '08:30'}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]).toMatchObject({
    createdAt: now().toISOString(),
    exactReminderAt: new Date('2026-09-06T08:30').toISOString(),
    id: 'calendar-alarm:connection-1:event-1',
    recallMode: 'none',
    text: '팀 회의 일정 알람이에요.',
  })
})

it('should show and remove an existing calendar alarm', async () => {
  mocks.memos = [
    {
      ...createMemoryMemo({
        exactReminderAt: '2026-09-05T09:00:00.000Z',
        id: 'calendar-alarm:connection-1:event-1',
        now: new Date('2026-09-04T03:00:00.000Z'),
        random: () => 0,
        recallMode: 'none',
        text: '팀 회의 일정 알람이에요.',
      }),
      dialogueId: 'memory-memo-calendar-alarm:connection-1:event-1',
    },
  ]
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)

  expect(screen.getByRole('button', {name: '팀 회의 알람 수정'})).toBeVisible()
  fireEvent.click(screen.getByRole('button', {name: '알람 해제'}))

  await waitFor(() =>
    expect(mocks.deleteDialogue).toHaveBeenCalledWith(
      'memory-memo-calendar-alarm:connection-1:event-1',
    ),
  )
  expect(mocks.memos).toEqual([])
})

const ownedAlarm = () => ({
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

it('should retain the stored alarm date instead of the selected day', () => {
  mocks.memos = [{...ownedAlarm(), exactReminderAt: new Date(2026, 8, 5, 8, 30).toISOString()}]
  render(() => (
    <CalendarAlarmControl
      now={now}
      defaultAlarmDate={new Date(2026, 8, 6)}
      event={event}
      memos={() => mocks.memos}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 수정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
  expect(screen.getByLabelText('시간')).toHaveValue('08:30')
})

it('should retain a timed event start instead of the selected day', () => {
  render(() => (
    <CalendarAlarmControl
      now={now}
      defaultAlarmDate={new Date(2026, 8, 6)}
      event={{...event, allDay: false, start: new Date(2026, 8, 5, 13, 30).toISOString()}}
      memos={() => mocks.memos}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-05')
  expect(screen.getByLabelText('시간')).toHaveValue('13:30')
})

it.each(['2026-09-05', '2026-09-07'])(
  'should reschedule an existing alarm to %s and preserve its dialogue',
  async (date) => {
    const oldTime = new Date('2026-09-06T08:30')
    const memo = {
      ...ownedAlarm(),
      exactReminderAt: oldTime.toISOString(),
      nextExactReminderAt: oldTime.toISOString(),
    }
    mocks.memos = [memo]
    render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
    fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 수정'}))
    fireEvent.input(screen.getByLabelText('날짜'), {target: {value: date}})
    fireEvent.input(screen.getByLabelText('시간'), {target: {value: '08:30'}})
    fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))

    await waitFor(() => expect(HTMLElement.prototype.hidePopover).toHaveBeenCalledOnce())
    const saved = mocks.memos[0]!
    const newTime = new Date(`${date}T08:30`)
    expect(saved).toMatchObject({
      createdAt: memo.createdAt,
      dialogueId: memo.dialogueId,
      exactReminderAt: newTime.toISOString(),
      nextExactReminderAt: newTime.toISOString(),
    })
    expect(getDueMemoryReminder(saved, new Date(newTime.getTime() - 1))).toBeNull()
    expect(getDueMemoryReminder(saved, newTime)).toBe('exact')
    if (newTime > oldTime) {
      expect(getDueMemoryReminder(saved, oldTime)).toBeNull()
    }
    expect(mocks.deleteDialogue).not.toHaveBeenCalled()
  },
)

it('should rearm a consumed alarm and preserve its reminder history', async () => {
  const memo = ownedAlarm()
  const consumed = advanceMemoryMemo({
    kind: 'exact',
    memo,
    now: new Date(memo.exactReminderAt!),
    random: () => 0,
  })
  currentTime = new Date('2026-09-05T12:00:00.000Z')
  mocks.memos = [consumed]
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: '2026-09-07'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '08:30'}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))

  await waitFor(() => expect(HTMLElement.prototype.hidePopover).toHaveBeenCalledOnce())
  const saved = mocks.memos[0]!
  const newTime = new Date('2026-09-07T08:30')
  expect(saved).toMatchObject({
    dialogueId: memo.dialogueId,
    exactReminderAt: newTime.toISOString(),
    nextExactReminderAt: newTime.toISOString(),
    reminderHistory: consumed.reminderHistory,
  })
  expect(getDueMemoryReminder(saved, now())).toBeNull()
  expect(getDueMemoryReminder(saved, newTime)).toBe('exact')
})

it('should preserve owned dialogue when alarm removal persistence fails', async () => {
  const memo = ownedAlarm()
  mocks.memos = [memo]
  const actual = await vi.importActual<typeof import('../../features/memory-assist/repository')>(
    '../../features/memory-assist/repository',
  )
  localStorage.setItem('pomo:memory-memos:v1', JSON.stringify([memo]))
  const setItem = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    function persistItem(this: Storage, key, value) {
      if (key === 'pomo:memory-memos:v1') {
        throw new DOMException('storage full', 'QuotaExceededError')
      }
      setItem.call(this, key, value)
    },
  )
  mocks.updateMemos.mockImplementation(actual.updateMemoryMemos)
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  fireEvent.click(screen.getByRole('button', {name: '알람 해제'}))
  await screen.findByText('알람을 해제하지 못했어요.')
  expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? '[]')).toEqual([memo])
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
  expect(mocks.deleteAudio).not.toHaveBeenCalled()
})

it('should commit removal before cleanup and recover a failed dialogue deletion', async () => {
  const memo = ownedAlarm()
  mocks.memos = [memo]
  let cleanupSnapshot: ReadonlyArray<MemoryMemo> = []
  mocks.deleteDialogue.mockImplementationOnce(async () => {
    cleanupSnapshot = mocks.memos
    throw new Error('dialogue cleanup failed')
  })
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  fireEvent.click(screen.getByRole('button', {name: '알람 해제'}))
  await waitFor(() => expect(HTMLElement.prototype.hidePopover).toHaveBeenCalledOnce())
  expect(cleanupSnapshot).toEqual([{...memo, deletionPending: true}])
  expect(screen.queryByText('알람을 해제하지 못했어요.')).not.toBeInTheDocument()
  expect(mocks.memos).toEqual([{...memo, deletionPending: true}])
  const {memoryMemoDeletion} = await import('../../features/memory-assist')
  await memoryMemoDeletion.delete({deleteDialogue: mocks.deleteDialogue, memoId: memo.id})
  expect(mocks.memos).toEqual([])
  expect(mocks.deleteAudio).toHaveBeenCalledWith(memo.dialogueId, {failureMode: 'throw'})
})

it('should ignore duplicate removal clicks while cleanup is pending', async () => {
  mocks.memos = [ownedAlarm()]
  const cleanup = Promise.withResolvers<void>()
  mocks.deleteDialogue.mockReturnValue(cleanup.promise)
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  const remove = screen.getByRole('button', {name: '알람 해제'})
  fireEvent.click(remove)
  fireEvent.click(remove)
  await waitFor(() => expect(mocks.deleteDialogue).toHaveBeenCalledOnce())
  expect(remove).toBeDisabled()
  expect(screen.getByRole('button', {name: '알람 저장'})).toBeDisabled()
  cleanup.resolve()
  await waitFor(() => expect(mocks.memos).toEqual([]))
})

it('should reject rearming an alarm while its previous cleanup is pending', async () => {
  const memo = {...ownedAlarm(), deletionPending: true as const}
  mocks.memos = [memo]
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => []} />)
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await screen.findByText('알람을 저장하지 못했어요.')
  expect(mocks.memos).toEqual([memo])
  expect(HTMLElement.prototype.hidePopover).not.toHaveBeenCalled()
})

it('should use the current injected clock when saving after the editor opens', async () => {
  currentTime = new Date(2026, 8, 4, 12)
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveAttribute('min', '2026-09-04')
  currentTime = new Date(2026, 8, 5, 9)
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  expect(mocks.updateMemos).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toBeVisible()
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '09:01'}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]?.createdAt).toBe(currentTime.toISOString())
})

it('should save, edit and remove scoped alarms independently while preserving a legacy alarm', async () => {
  const legacy = createMemoryMemo({
    exactReminderAt: new Date('2026-09-05T09:00').toISOString(),
    id: 'calendar-alarm:connection-1:abcde12345',
    now: now(),
    random: () => 0,
    recallMode: 'none',
    text: '기존 일정 알람',
  })
  const [memos, setMemos] = createSignal<ReadonlyArray<MemoryMemo>>([legacy])
  mocks.memos = memos()
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(memos())
    setMemos(mocks.memos)
    return mocks.memos
  })
  const work = {...event, id: 'connection-1:["work","abcde12345"]', title: 'Work'}
  const personal = {...event, id: 'connection-1:["personal","abcde12345"]', title: 'Personal'}
  const workView = render(() => <CalendarAlarmControl now={now} event={work} memos={memos} />)
  const personalView = render(() => (
    <CalendarAlarmControl now={now} event={personal} memos={memos} />
  ))
  const workControl = within(workView.container)
  const personalControl = within(personalView.container)
  expect(
    workControl.getByText(
      '이전 일정 알람이 별도로 남아 있어요. 새 알람과 중복될 수 있으니 기억 도우미의 메모 목록에서 확인하거나 해제해 주세요.',
    ),
  ).toBeInTheDocument()
  fireEvent.click(workControl.getByRole('button', {name: 'Work 알람 설정'}))
  fireEvent.click(workControl.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(memos()).toHaveLength(2))
  expect(personalControl.getByRole('button', {name: 'Personal 알람 설정'})).toBeInTheDocument()
  fireEvent.click(personalControl.getByRole('button', {name: 'Personal 알람 설정'}))
  fireEvent.click(personalControl.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(memos()).toHaveLength(3))
  const personalMemo = memos().find((memo) => memo.id === `calendar-alarm:${personal.id}`)
  expect(personalMemo).toBeDefined()

  await waitFor(() => expect(workControl.getByRole('button', {name: '알람 저장'})).toBeEnabled())
  fireEvent.click(workControl.getByRole('button', {name: 'Work 알람 수정'}))
  fireEvent.input(workControl.getByLabelText('시간'), {target: {value: '10:30'}})
  fireEvent.click(workControl.getByRole('button', {name: '알람 저장'}))
  await waitFor(() =>
    expect(memos().find((memo) => memo.id === `calendar-alarm:${work.id}`)?.exactReminderAt).toBe(
      new Date('2026-09-05T10:30').toISOString(),
    ),
  )
  expect(memos()).toContainEqual(personalMemo)
  await waitFor(() => expect(workControl.getByRole('button', {name: '알람 해제'})).toBeEnabled())
  fireEvent.click(workControl.getByRole('button', {name: '알람 해제'}))
  await waitFor(() => expect(memos()).toEqual([personalMemo, legacy]))
  expect(workControl.getByRole('button', {name: 'Work 알람 설정'})).toBeInTheDocument()
  expect(personalControl.getByRole('button', {name: 'Personal 알람 수정'})).toBeInTheDocument()
  expect(workControl.getByRole('status')).toHaveTextContent('이전 일정 알람')
  setMemos(
    memos().map((memo) => (memo.id === legacy.id ? {...memo, nextExactReminderAt: null} : memo)),
  )
  expect(workControl.queryByRole('status')).not.toBeInTheDocument()
  setMemos(memos().map((memo) => (memo.id === legacy.id ? legacy : memo)))
  expect(workControl.getByRole('status')).toHaveTextContent('이전 일정 알람')
  setMemos(memos().filter((memo) => memo.id !== legacy.id))
  expect(workControl.queryByRole('status')).not.toBeInTheDocument()
  expect(personalControl.queryByRole('status')).not.toBeInTheDocument()
})

it('should preserve owned dialogue when renamed-event alarm persistence fails', async () => {
  const memo = ownedAlarm()
  mocks.memos = [memo]
  const actual = await vi.importActual<typeof import('../../features/memory-assist/repository')>(
    '../../features/memory-assist/repository',
  )
  localStorage.setItem('pomo:memory-memos:v1', JSON.stringify([memo]))
  const setItem = Storage.prototype.setItem
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    function persistItem(this: Storage, key, value) {
      if (key === 'pomo:memory-memos:v1') {
        throw new DOMException('storage full', 'QuotaExceededError')
      }
      setItem.call(this, key, value)
    },
  )
  mocks.updateMemos.mockImplementation(actual.updateMemoryMemos)
  render(() => (
    <CalendarAlarmControl
      now={now}
      event={{...event, title: '변경된 팀 회의'}}
      memos={() => mocks.memos}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '변경된 팀 회의 알람 수정'}))
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await screen.findByText('알람을 저장하지 못했어요.')
  expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? '[]')).toEqual([memo])
  expect(mocks.deleteDialogue).not.toHaveBeenCalled()
  expect(mocks.deleteAudio).not.toHaveBeenCalled()
})

it('should commit renamed alarm before cleanup and retain failed cleanup for retry', async () => {
  const memo = ownedAlarm()
  mocks.memos = [memo]
  let cleanupSnapshot: ReadonlyArray<MemoryMemo> = []
  mocks.deleteDialogue.mockImplementationOnce(async () => {
    cleanupSnapshot = mocks.memos
    throw new Error('cleanup failed')
  })
  render(() => (
    <CalendarAlarmControl
      now={now}
      event={{...event, title: '변경된 팀 회의'}}
      memos={() => mocks.memos}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '변경된 팀 회의 알람 수정'}))
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(HTMLElement.prototype.hidePopover).toHaveBeenCalledOnce())
  expect(mocks.deleteDialogue).toHaveBeenCalledExactlyOnceWith(memo.dialogueId)
  expect(cleanupSnapshot[0]).toMatchObject({
    dialogueId: null,
    retiredDialogueIds: [memo.dialogueId],
    text: '변경된 팀 회의 일정 알람이에요.',
  })
  expect(mocks.memos[0]?.retiredDialogueIds).toEqual([memo.dialogueId])
  expect(screen.queryByText('알람을 저장하지 못했어요.')).not.toBeInTheDocument()
  const {memoryMemoDeletion} = await import('../../features/memory-assist')
  await memoryMemoDeletion.retry(mocks.deleteDialogue)
  expect(mocks.memos[0]).toMatchObject({dialogueId: null, retiredDialogueIds: []})
})
