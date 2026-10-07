/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {advanceMemoryMemo, createMemoryMemo, editMemoryMemo} from '../schedule'
import {parseMemoryMemos} from '../schema'

const NOW = new Date('2026-09-04T03:00:00.000Z')

describe('editMemoryMemo', () => {
  it.each([
    {
      events: [
        {kind: 'exact' as const, scheduledAt: '2026-09-04T04:00:00.000Z'},
        {kind: 'exact' as const, scheduledAt: '2026-09-04T04:10:00.000Z'},
        {kind: 'recall' as const, scheduledAt: '2026-09-04T04:15:00.000Z'},
      ],
      expected: '2026-09-04T04:25:00.000Z',
      history: [],
      scenario: 'the last exact event before a trailing recall event',
    },
    {
      events: [
        {kind: 'exact' as const, scheduledAt: '2026-09-04T04:20:00.000Z'},
        {kind: 'exact' as const, scheduledAt: '2026-09-04T04:10:00.000Z'},
      ],
      expected: '2026-09-04T04:25:00.000Z',
      history: [],
      scenario: 'the last stored exact event when timestamps are out of order',
    },
    {
      events: [{kind: 'recall' as const, scheduledAt: '2026-09-04T04:50:00.000Z'}],
      expected: '2026-09-04T04:15:00.000Z',
      history: ['2026-09-04T04:00:00.000Z'],
      scenario: 'legacy history when no exact event exists',
    },
    {
      events: [],
      expected: '2026-09-04T04:35:00.000Z',
      history: [],
      scenario: 'the pending occurrence when both histories are empty',
    },
  ])(
    'should recompute from $scenario without changing the stored memo',
    ({events, expected, history}) => {
      const memo = parseMemoryMemos([
        {
          ...createMemoryMemo({
            exactReminderAt: '2026-09-04T04:00:00.000Z',
            exactReminderRepeatIntervalMinutes: 10,
            exactReminderRepeatUntilMinutes: 60,
            id: 'memo-1',
            now: NOW,
            random: () => 0,
            recallMode: 'none',
            text: '여권 갱신하기',
          }),
          nextExactReminderAt: '2026-09-04T04:30:00.000Z',
          reminderEvents: events.map((event) => ({...event, deliveredAt: event.scheduledAt})),
          reminderHistory: history,
        },
      ])?.[0]
      expect(memo).toBeDefined()
      if (memo === undefined) {
        return
      }
      const snapshot = structuredClone(memo)
      Object.freeze(memo)
      memo.reminderEvents.forEach(Object.freeze)

      const edited = editMemoryMemo({
        exactReminderAt: memo.exactReminderAt,
        exactReminderRepeatIntervalMinutes: 15,
        exactReminderRepeatUntilMinutes: 60,
        memo,
        now: new Date('2026-09-04T04:12:00.000Z'),
        random: () => 0,
        recallMode: 'none',
        text: memo.text,
      })

      expect(edited.nextExactReminderAt).toBe(expected)
      expect(edited.reminderEvents).toBe(memo.reminderEvents)
      expect(memo).toEqual(snapshot)
    },
  )

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
