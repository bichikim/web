/** @vitest-environment jsdom */
import {event, mocks, now, ownedAlarm, setupCalendarAlarmControl} from './fixtures/setup'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {MEMORY_MEMOS_CHANGED_EVENT} from '../../../features/memory-assist/repository'
import {createMemoryMemo, type MemoryMemo, useMemoryMemos} from '../../../features/memory-assist'
import {CalendarAlarmControl} from '../CalendarAlarmControl'

setupCalendarAlarmControl()

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

it('should keep a deleted calendar alarm inactive after a newer storage event', () => {
  const memo = ownedAlarm()
  render(() => {
    const memos = useMemoryMemos()
    return <CalendarAlarmControl now={now} event={event} memos={memos} />
  })

  globalThis.dispatchEvent(
    new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {
      detail: {memos: [{...memo, deletionPending: true as const}], revision: 2},
    }),
  )
  globalThis.dispatchEvent(
    new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {
      detail: {memos: [memo], revision: 3},
    }),
  )

  expect(screen.getByRole('button', {name: '팀 회의 알람 설정'})).toBeVisible()
  expect(screen.queryByRole('button', {name: '팀 회의 알람 수정'})).not.toBeInTheDocument()
})

it('should preserve owned dialogue when alarm removal persistence fails', async () => {
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
  const {memoryMemoDeletion} = await import('../../../features/memory-assist')
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
