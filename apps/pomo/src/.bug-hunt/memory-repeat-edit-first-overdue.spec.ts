/** @vitest-environment node */
import {expect, it} from 'vitest'
import {createMemoryMemo, editMemoryMemo} from '../features/memory-assist/schedule'

const baseMemo = () =>
  createMemoryMemo({
    exactReminderAt: '2026-09-04T04:00:00.000Z',
    exactReminderRepeatIntervalMinutes: 10,
    exactReminderRepeatUntilMinutes: 60,
    id: 'memo-repeat-first-overdue',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '반복 알림',
  })

const overdueNow = new Date('2026-09-04T04:12:00.000Z')

it('should recompute nextExactReminderAt when the repeat interval changes before the first delivery', () => {
  const memo = baseMemo()
  expect(Date.parse(memo.nextExactReminderAt!)).toBeLessThan(overdueNow.getTime())

  const edited = editMemoryMemo({
    exactReminderAt: memo.exactReminderAt,
    exactReminderRepeatIntervalMinutes: 5,
    exactReminderRepeatUntilMinutes: 60,
    memo,
    now: overdueNow,
    random: () => 0,
    recallMode: 'none',
    text: memo.text,
  })

  expect(edited.nextExactReminderAt).toBe('2026-09-04T04:15:00.000Z')
})

it('should clear nextExactReminderAt when repeat-until no longer covers an overdue first occurrence', () => {
  const memo = baseMemo()

  const edited = editMemoryMemo({
    exactReminderAt: memo.exactReminderAt,
    exactReminderRepeatIntervalMinutes: 10,
    exactReminderRepeatUntilMinutes: 5,
    memo,
    now: overdueNow,
    random: () => 0,
    recallMode: 'none',
    text: memo.text,
  })

  expect(edited.nextExactReminderAt).toBeNull()
})

it('should schedule the next repeat when adding an interval to an overdue one-shot reminder', () => {
  const memo = createMemoryMemo({
    exactReminderAt: '2026-09-04T04:00:00.000Z',
    id: 'memo-one-shot-overdue',
    now: new Date('2026-09-04T03:00:00.000Z'),
    random: () => 0,
    recallMode: 'none',
    text: '일회 알림',
  })

  const edited = editMemoryMemo({
    exactReminderAt: memo.exactReminderAt,
    exactReminderRepeatIntervalMinutes: 5,
    exactReminderRepeatUntilMinutes: 30,
    memo,
    now: overdueNow,
    random: () => 0,
    recallMode: 'none',
    text: memo.text,
  })

  expect(edited.nextExactReminderAt).toBe('2026-09-04T04:15:00.000Z')
})
