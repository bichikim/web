/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  advanceMemoryMemo,
  createMemoryMemo,
  editMemoryMemo,
  getDueMemoryReminder,
  getNextRecallAt,
  MEMORY_REINFORCEMENT_INTERVALS,
} from '../schedule'

const NOW = new Date('2026-09-04T03:00:00.000Z')

describe('createMemoryMemo', () => {
  it('should disable ongoing recall when an exact reminder is scheduled', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      id: 'memo-1',
      now: NOW,
      random: () => 0.5,
      recallMode: 'random',
      text: '여권 갱신하기',
    })

    expect(memo).toMatchObject({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: [],
      text: '여권 갱신하기',
      version: 1,
    })
  })

  it('should schedule repeated exact reminders without ongoing recall', () => {
    const memo = createMemoryMemo({
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      id: 'memo-1',
      now: NOW,
      random: () => 0.5,
      recallMode: 'random',
      text: '여권 갱신하기',
    })

    expect(memo).toMatchObject({
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      nextExactReminderAt: '2026-09-04T03:30:00.000Z',
      nextRecallAt: null,
      recallMode: 'none',
    })
  })
})

describe('editMemoryMemo', () => {
  it('should update text and restart a changed recall schedule while preserving memo history', () => {
    const memo = {
      ...createMemoryMemo({
        exactReminderAt: '2026-09-04T04:00:00.000Z',
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'reinforcement' as const,
        text: '여권 갱신하기',
      }),
      dialogueId: 'memory-memo-memo-1',
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T03:10:00.000Z',
          kind: 'recall' as const,
          scheduledAt: '2026-09-04T03:10:00.000Z',
        },
      ],
      reminderHistory: ['2026-09-04T03:10:00.000Z'],
    }

    expect(
      editMemoryMemo({
        exactReminderAt: null,
        memo,
        now: new Date('2026-09-04T03:30:00.000Z'),
        random: () => 0.5,
        recallMode: 'random',
        text: '  여권과 사진 갱신하기  ',
      }),
    ).toEqual({
      ...memo,
      dialogueId: null,
      exactReminderAt: null,
      nextExactReminderAt: null,
      nextRecallAt: '2026-09-04T04:35:00.000Z',
      recallMode: 'random',
      reinforcementIndex: 0,
      text: '여권과 사진 갱신하기',
      updatedAt: '2026-09-04T03:30:00.000Z',
    })
  })

  it('should restart a reinforcement schedule when text changes without changing recall mode', () => {
    const memo = {
      ...createMemoryMemo({
        exactReminderAt: null,
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'reinforcement' as const,
        text: '여권 갱신하기',
      }),
      dialogueId: 'memory-memo-memo-1',
      nextRecallAt: '2026-09-11T03:00:00.000Z',
      reinforcementIndex: 4,
    }

    expect(
      editMemoryMemo({
        exactReminderAt: null,
        memo,
        now: new Date('2026-09-04T03:30:00.000Z'),
        random: () => 0,
        recallMode: 'reinforcement',
        text: '여권과 사진 갱신하기',
      }),
    ).toEqual({
      ...memo,
      dialogueId: null,
      nextRecallAt: '2026-09-04T03:40:00.000Z',
      reinforcementIndex: 0,
      text: '여권과 사진 갱신하기',
      updatedAt: '2026-09-04T03:30:00.000Z',
    })
  })

  it('should stop recall progress when an exact schedule is enabled', () => {
    const memo = {
      ...createMemoryMemo({
        exactReminderAt: null,
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'reinforcement' as const,
        text: '여권 갱신하기',
      }),
      dialogueId: 'memory-memo-memo-1',
      reinforcementIndex: 2,
    }

    expect(
      editMemoryMemo({
        exactReminderAt: '2026-09-05T04:00:00.000Z',
        memo,
        now: new Date('2026-09-04T03:30:00.000Z'),
        random: () => 1,
        recallMode: 'reinforcement',
        text: '여권 갱신하기',
      }),
    ).toEqual({
      ...memo,
      exactReminderAt: '2026-09-05T04:00:00.000Z',
      nextExactReminderAt: '2026-09-05T04:00:00.000Z',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      updatedAt: '2026-09-04T03:30:00.000Z',
    })
  })

  it('should rearm a consumed exact reminder when saving the same schedule', () => {
    const memo = {
      ...createMemoryMemo({
        exactReminderAt: '2026-09-04T04:00:00.000Z',
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'none' as const,
        text: '여권 갱신하기',
      }),
      nextExactReminderAt: null,
    }

    const saved = editMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      memo,
      now: new Date('2026-09-04T03:30:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: memo.text,
    })

    expect(saved.nextExactReminderAt).toBe('2026-09-04T04:00:00.000Z')
  })

  it('should preserve the pending exact occurrence when repeat is disabled', () => {
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
      exactReminderRepeatIntervalMinutes: null,
      exactReminderRepeatUntilMinutes: 0,
      memo: first,
      now: new Date('2026-09-04T04:05:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: first.text,
    })

    expect(edited).toMatchObject({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: null,
      nextExactReminderAt: '2026-09-04T04:10:00.000Z',
    })
    expect(getDueMemoryReminder(edited, new Date('2026-09-04T04:05:00.000Z'))).toBeNull()
    expect(getDueMemoryReminder(edited, new Date('2026-09-04T04:10:00.000Z'))).toBe('exact')
  })

  it('should discard an advanced exact occurrence outside a shortened repeat window', () => {
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
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 5,
      memo: first,
      now: new Date('2026-09-04T04:05:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: first.text,
    })

    expect(edited.nextExactReminderAt).toBeNull()
    expect(getDueMemoryReminder(edited, new Date('2026-09-04T04:05:00.000Z'))).toBeNull()
  })
})

describe('getDueMemoryReminder', () => {
  it('should prefer an overdue exact reminder before an overdue recall', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T03:30:00.000Z',
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'random',
      text: '여권 갱신하기',
    })

    expect(getDueMemoryReminder(memo, new Date('2026-09-04T04:00:00.000Z'))).toBe('exact')
  })

  it('should return null before either reminder is due', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'reinforcement',
      text: '여권 갱신하기',
    })

    expect(getDueMemoryReminder(memo, new Date('2026-09-04T03:05:00.000Z'))).toBeNull()
  })

  it('should ignore a due reminder while deletion is pending', () => {
    const memo = {
      ...createMemoryMemo({
        exactReminderAt: '2026-09-04T02:30:00.000Z',
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'none',
        text: '여권 갱신하기',
      }),
      deletionPending: true as const,
    }

    expect(getDueMemoryReminder(memo, NOW)).toBeNull()
  })
})

describe('getNextRecallAt', () => {
  it('should use the evidence-informed expanding reinforcement intervals', () => {
    expect(MEMORY_REINFORCEMENT_INTERVALS).toEqual([
      10 * 60_000,
      8 * 60 * 60_000,
      24 * 60 * 60_000,
      3 * 24 * 60 * 60_000,
      7 * 24 * 60 * 60_000,
      14 * 24 * 60 * 60_000,
      30 * 24 * 60 * 60_000,
    ])
    expect(
      getNextRecallAt({mode: 'reinforcement', now: NOW, random: () => 0, reinforcementIndex: 1}),
    ).toBe('2026-09-04T11:00:00.000Z')
  })

  it('should keep random recall within ten minutes and two hours', () => {
    expect(
      getNextRecallAt({mode: 'random', now: NOW, random: () => 0, reinforcementIndex: 0}),
    ).toBe('2026-09-04T03:10:00.000Z')
    expect(
      getNextRecallAt({mode: 'random', now: NOW, random: () => 1, reinforcementIndex: 0}),
    ).toBe('2026-09-04T05:00:00.000Z')
  })
})

describe('advanceMemoryMemo', () => {
  it('should consume a one-time exact reminder without starting recall', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T03:10:00.000Z',
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'reinforcement',
      text: '여권 갱신하기',
    })

    expect(
      advanceMemoryMemo({
        kind: 'exact',
        memo,
        now: new Date('2026-09-04T03:10:00.000Z'),
        random: () => 0,
      }),
    ).toMatchObject({
      exactReminderAt: null,
      nextRecallAt: null,
      reinforcementIndex: 0,
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T03:10:00.000Z',
          kind: 'exact' as const,
          scheduledAt: '2026-09-04T03:10:00.000Z',
        },
      ],
      reminderHistory: ['2026-09-04T03:10:00.000Z'],
    })
  })

  it('should leave an overdue recall pending when an exact reminder is delivered first', () => {
    const dueAt = '2026-09-04T03:10:00.000Z'
    const memo = {
      ...createMemoryMemo({
        exactReminderAt: null,
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'reinforcement',
        text: '여권 갱신하기',
      }),
      nextExactReminderAt: dueAt,
      nextRecallAt: dueAt,
    }
    const advanced = advanceMemoryMemo({
      kind: 'exact',
      memo,
      now: new Date(dueAt),
      random: () => 0,
    })

    expect(getDueMemoryReminder(memo, new Date(dueAt))).toBe('exact')
    expect(advanced).toMatchObject({
      nextExactReminderAt: null,
      nextRecallAt: dueAt,
      reinforcementIndex: 0,
      reminderEvents: [
        {
          deliveredAt: dueAt,
          kind: 'exact',
          scheduledAt: dueAt,
        },
      ],
    })
    expect(getDueMemoryReminder(advanced, new Date(dueAt))).toBe('recall')
  })

  it('should record the scheduled and delivered times for a delayed exact reminder', () => {
    const memo = createMemoryMemo({
      exactReminderAt: '2026-09-04T03:10:00.000Z',
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    })

    expect(
      advanceMemoryMemo({
        kind: 'exact',
        memo,
        now: new Date('2026-09-04T03:15:00.000Z'),
        random: () => 0,
      }),
    ).toMatchObject({
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T03:15:00.000Z',
          kind: 'exact',
          scheduledAt: '2026-09-04T03:10:00.000Z',
        },
      ],
      reminderHistory: ['2026-09-04T03:15:00.000Z'],
    })
  })

  it.each(['exact', 'recall'] as const)(
    'should reject a %s delivery without a schedule',
    (kind) => {
      const memo = createMemoryMemo({
        exactReminderAt: null,
        id: 'memo-1',
        now: NOW,
        random: () => 0,
        recallMode: 'none',
        text: '여권 갱신하기',
      })

      expect(() => advanceMemoryMemo({kind, memo, now: NOW, random: () => 0})).toThrow(
        'Cannot record a reminder without its scheduled time.',
      )
      expect(memo.reminderEvents).toEqual([])
    },
  )

  it('should record the scheduled and delivered times for a recall reminder', () => {
    const memo = createMemoryMemo({
      exactReminderAt: null,
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'random',
      text: '여권 갱신하기',
    })

    expect(
      advanceMemoryMemo({
        kind: 'recall',
        memo,
        now: new Date('2026-09-04T03:15:00.000Z'),
        random: () => 0,
      }),
    ).toMatchObject({
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T03:15:00.000Z',
          kind: 'recall',
          scheduledAt: '2026-09-04T03:10:00.000Z',
        },
      ],
      reminderHistory: ['2026-09-04T03:15:00.000Z'],
    })
  })

  it('should advance only the repeated exact reminder until its configured end', () => {
    const memo = createMemoryMemo({
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'random',
      text: '여권 갱신하기',
    })
    const first = advanceMemoryMemo({
      kind: 'exact',
      memo,
      now: new Date('2026-09-04T03:30:00.000Z'),
      random: () => 0,
    })
    const final = advanceMemoryMemo({
      kind: 'exact',
      memo: {...first, nextExactReminderAt: '2026-09-04T04:20:00.000Z'},
      now: new Date('2026-09-04T04:20:00.000Z'),
      random: () => 0,
    })

    expect(first).toMatchObject({
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      nextExactReminderAt: '2026-09-04T03:40:00.000Z',
      nextRecallAt: null,
    })
    expect(final).toMatchObject({
      nextExactReminderAt: null,
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T03:30:00.000Z',
          kind: 'exact',
          scheduledAt: '2026-09-04T03:30:00.000Z',
        },
        {
          deliveredAt: '2026-09-04T04:20:00.000Z',
          kind: 'exact',
          scheduledAt: '2026-09-04T04:20:00.000Z',
        },
      ],
      reminderHistory: ['2026-09-04T03:30:00.000Z', '2026-09-04T04:20:00.000Z'],
    })
  })

  it('should preserve the configured cadence when a repeated exact reminder runs late', () => {
    const memo = createMemoryMemo({
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 60,
      id: 'memo-1',
      now: NOW,
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    })

    expect(
      advanceMemoryMemo({
        kind: 'exact',
        memo,
        now: new Date('2026-09-04T03:35:00.000Z'),
        random: () => 0,
      }).nextExactReminderAt,
    ).toBe('2026-09-04T03:40:00.000Z')
  })
})
