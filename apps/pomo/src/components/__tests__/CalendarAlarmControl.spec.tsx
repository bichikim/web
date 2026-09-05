/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {CalendarEvent} from '../../features/calendar'
import {createMemoryMemo, type MemoryMemo} from '../../features/memory-assist'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

const mocks = vi.hoisted(() => ({
  deleteAudio: vi.fn(),
  deleteDialogue: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  updateMemos: vi.fn(),
}))

vi.mock('../../features/focus-room-dialogue', () => ({
  deleteDialogueAudio: mocks.deleteAudio,
  usePEvents: () => ({deleteDialogue: mocks.deleteDialogue}),
}))
vi.mock('../../features/memory-assist/repository', async () => {
  const actual = await vi.importActual('../../features/memory-assist/repository')
  return {
    ...actual,
    updateMemoryMemos: mocks.updateMemos,
  }
})
vi.mock('../PButton', () => ({
  PButton: (props: {
    accessibleLabel?: string
    children: JSX.Element
    disabled?: boolean
    onPress?: () => void
  }) => (
    <button aria-label={props.accessibleLabel} disabled={props.disabled} onClick={props.onPress}>
      {props.children}
    </button>
  ),
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
  vi.useFakeTimers({toFake: ['Date']})
  vi.setSystemTime(new Date('2026-09-04T03:00:00.000Z'))
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
  vi.useRealTimers()
  Object.defineProperty(HTMLElement.prototype, 'matches', {
    configurable: true,
    value: matches,
  })
})

it('should save an exact Pomo reminder for a calendar event', async () => {
  render(() => <CalendarAlarmControl event={event} memos={() => mocks.memos} />)

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
  render(() => <CalendarAlarmControl event={event} memos={() => mocks.memos} />)

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
    now: new Date(),
    random: () => 0,
    recallMode: 'none',
    text: '팀 회의 일정 알람이에요.',
  }),
  dialogueId: 'memory-memo-calendar-alarm:connection-1:event-1',
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
  render(() => <CalendarAlarmControl event={event} memos={() => mocks.memos} />)
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
  render(() => <CalendarAlarmControl event={event} memos={() => mocks.memos} />)
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
  render(() => <CalendarAlarmControl event={event} memos={() => mocks.memos} />)
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
  render(() => <CalendarAlarmControl event={event} memos={() => []} />)
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await screen.findByText('알람을 저장하지 못했어요.')
  expect(mocks.memos).toEqual([memo])
  expect(HTMLElement.prototype.hidePopover).not.toHaveBeenCalled()
})
