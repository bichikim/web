/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {advanceMemoryMemo, createMemoryMemo, editMemoryMemo} from '../schedule'

const NOW = new Date('2026-09-04T03:00:00.000Z')

describe('editMemoryMemo', () => {
  it('should recompute the pending exact occurrence when the repeat interval changes', () => {
    const first = advanceMemoryMemo({
      kind: 'exact',
      memo: createMemoryMemo({
        exactReminderAt: '2026-09-04T04:00:00.000Z',
        exactReminderRepeatIntervalMinutes: 10,
        exactReminderRepeatUntilMinutes: 20,
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'none',
        text: '여권 갱신하기',
      }),
      now: new Date('2026-09-04T04:00:00.000Z'),
      random: () => 0,
    })
    const edited = editMemoryMemo({
      exactReminderAt: first.exactReminderAt,
      exactReminderRepeatIntervalMinutes: 15,
      exactReminderRepeatUntilMinutes: 20,
      memo: first,
      now: new Date('2026-09-04T04:05:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: first.text,
    })

    expect(first.nextExactReminderAt).toBe('2026-09-04T04:10:00.000Z')
    expect(edited).toMatchObject({
      exactReminderRepeatIntervalMinutes: 15,
      nextExactReminderAt: '2026-09-04T04:15:00.000Z',
    })
  })

  it('should advance an overdue unconsumed first occurrence after the repeat interval changes', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 60,
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    })
    const edited = editMemoryMemo({
      exactReminderAt: memo.exactReminderAt,
      exactReminderRepeatIntervalMinutes: 5,
      exactReminderRepeatUntilMinutes: 60,
      memo,
      now: new Date('2026-09-04T04:12:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: memo.text,
    })

    expect(memo.reminderEvents).toEqual([])
    expect(memo.nextExactReminderAt).toBe('2026-09-04T04:00:00.000Z')
    expect(edited.nextExactReminderAt).toBe('2026-09-04T04:15:00.000Z')
  })

  it('should clear an overdue first occurrence when the edited repeat window has ended', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 60,
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    })
    const edited = editMemoryMemo({
      exactReminderAt: memo.exactReminderAt,
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 5,
      memo,
      now: new Date('2026-09-04T04:12:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: memo.text,
    })

    expect(edited.nextExactReminderAt).toBeNull()
  })

  it('should schedule the next repeat when repetition is added to an overdue one-off reminder', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    })
    const edited = editMemoryMemo({
      exactReminderAt: memo.exactReminderAt,
      exactReminderRepeatIntervalMinutes: 5,
      exactReminderRepeatUntilMinutes: 20,
      memo,
      now: new Date('2026-09-04T04:12:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: memo.text,
    })

    expect(memo.nextExactReminderAt).toBe('2026-09-04T04:00:00.000Z')
    expect(edited.nextExactReminderAt).toBe('2026-09-04T04:15:00.000Z')
  })

  it('should recompute a legacy repeat interval from its reminder history', () => {
    const first = advanceMemoryMemo({
      kind: 'exact',
      memo: createMemoryMemo({
        exactReminderAt: '2026-09-04T04:00:00.000Z',
        exactReminderRepeatIntervalMinutes: 10,
        exactReminderRepeatUntilMinutes: 60,
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'none',
        text: '여권 갱신하기',
      }),
      now: new Date('2026-09-04T04:00:00.000Z'),
      random: () => 0,
    })
    const second = advanceMemoryMemo({
      kind: 'exact',
      memo: first,
      now: new Date('2026-09-04T04:25:00.000Z'),
      random: () => 0,
    })
    const legacyMemo = {...second, reminderEvents: []}
    const edited = editMemoryMemo({
      exactReminderAt: legacyMemo.exactReminderAt,
      exactReminderRepeatIntervalMinutes: 15,
      exactReminderRepeatUntilMinutes: 60,
      memo: legacyMemo,
      now: new Date('2026-09-04T04:26:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: legacyMemo.text,
    })

    expect(first.nextExactReminderAt).toBe('2026-09-04T04:10:00.000Z')
    expect(second.nextExactReminderAt).toBe('2026-09-04T04:30:00.000Z')
    expect(edited.nextExactReminderAt).toBe('2026-09-04T04:40:00.000Z')
  })
})
