/** @vitest-environment jsdom */
import type {CalendarEvent} from '../../../features/calendar'
import {
  CALENDAR_TIME_ZONE,
  clock,
  event,
  EXPECTED_DEFAULT_ALARM_AT,
  EXPECTED_SAVED_ALARM_AT,
  HOST_DEFAULT_ALARM_AT,
  HOST_SAVED_ALARM_AT,
  mocks,
  now,
  ownedAlarm,
  setupCalendarAlarmControl,
} from './fixtures/setup'
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {
  advanceMemoryMemo,
  createMemoryMemo,
  getDueMemoryReminder,
  type MemoryMemo,
} from '../../../features/memory-assist'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

setupCalendarAlarmControl()

it('should default a spanning all-day alarm to the selected calendar day', async () => {
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
      timeZone={CALENDAR_TIME_ZONE}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-06')
  expect(screen.getByLabelText('시간')).toHaveValue('09:00')
  expect(EXPECTED_DEFAULT_ALARM_AT).not.toBe(HOST_DEFAULT_ALARM_AT.toISOString())
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]?.exactReminderAt).toBe(EXPECTED_DEFAULT_ALARM_AT)
})

it('should save an all-day alarm time in the calendar time zone', async () => {
  render(() => (
    <CalendarAlarmControl
      now={now}
      event={event}
      memos={() => mocks.memos}
      timeZone={CALENDAR_TIME_ZONE}
    />
  ))

  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.input(screen.getByLabelText('날짜'), {target: {value: '2026-09-06'}})
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '08:30'}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))

  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]?.exactReminderAt).toBe(EXPECTED_SAVED_ALARM_AT)
  expect(EXPECTED_SAVED_ALARM_AT).not.toBe(HOST_SAVED_ALARM_AT.toISOString())
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
  clock.current = new Date('2026-09-05T12:00:00.000Z')
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

it('should reject rearming an alarm while its previous cleanup is pending', async () => {
  const memo = {...ownedAlarm(), deletionPending: true as const}
  mocks.memos = [memo]
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await screen.findByText('알람을 저장하지 못했어요.')
  expect(mocks.memos).toEqual([memo])
  expect(HTMLElement.prototype.hidePopover).not.toHaveBeenCalled()
})

it('should use the current injected clock when saving after the editor opens', async () => {
  clock.current = new Date(2026, 8, 4, 12)
  render(() => <CalendarAlarmControl now={now} event={event} memos={() => mocks.memos} />)
  fireEvent.click(screen.getByRole('button', {name: '팀 회의 알람 설정'}))
  expect(screen.getByLabelText('날짜')).toHaveAttribute('min', '2026-09-04')
  clock.current = new Date(2026, 8, 5, 9)
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  expect(mocks.updateMemos).not.toHaveBeenCalled()
  expect(screen.getByRole('status')).toBeVisible()
  fireEvent.input(screen.getByLabelText('시간'), {target: {value: '09:01'}})
  fireEvent.click(screen.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  expect(mocks.memos[0]?.createdAt).toBe(clock.current.toISOString())
})

it('should save, edit and remove scoped alarms independently while replacing a legacy alarm', async () => {
  const legacy = {
    ...createMemoryMemo({
      exactReminderAt: new Date('2026-09-05T09:00').toISOString(),
      id: 'calendar-alarm:connection-1:abcde12345',
      now: now(),
      random: () => 0,
      recallMode: 'none',
      text: '기존 일정 알람',
    }),
    dialogueId: 'memory-memo-calendar-alarm:connection-1:abcde12345',
  }
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
      '이전 일정 알람이 별도로 남아 있어요. 새 알람과 중복될 수 있으니 생각 보조의 메모 목록에서 확인하거나 해제해 주세요.',
    ),
  ).toBeInTheDocument()
  fireEvent.click(workControl.getByRole('button', {name: 'Work 알람 설정'}))
  fireEvent.click(workControl.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(memos()).toHaveLength(1))
  expect(mocks.deleteDialogue).toHaveBeenCalledExactlyOnceWith(legacy.dialogueId)
  expect(workControl.queryByRole('status')).not.toBeInTheDocument()
  expect(personalControl.queryByRole('status')).not.toBeInTheDocument()
  expect(personalControl.getByRole('button', {name: 'Personal 알람 설정'})).toBeInTheDocument()
  fireEvent.click(personalControl.getByRole('button', {name: 'Personal 알람 설정'}))
  fireEvent.click(personalControl.getByRole('button', {name: '알람 저장'}))
  await waitFor(() => expect(memos()).toHaveLength(2))
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
  await waitFor(() => expect(memos()).toEqual([personalMemo]))
  expect(workControl.getByRole('button', {name: 'Work 알람 설정'})).toBeInTheDocument()
  expect(personalControl.getByRole('button', {name: 'Personal 알람 수정'})).toBeInTheDocument()
  expect(workControl.queryByRole('status')).not.toBeInTheDocument()
  expect(personalControl.queryByRole('status')).not.toBeInTheDocument()
})

it('should preserve owned dialogue when renamed-event alarm persistence fails', async () => {
  const memo = ownedAlarm()
  mocks.memos = [memo]
  const actual = await vi.importActual<typeof import('../../../features/memory-assist/repository')>(
    '../../../features/memory-assist/repository',
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
  const {memoryMemoDeletion} = await import('../../../features/memory-assist')
  await memoryMemoDeletion.retry(mocks.deleteDialogue)
  expect(mocks.memos[0]).toMatchObject({dialogueId: null, retiredDialogueIds: []})
})
