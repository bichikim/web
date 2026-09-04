import {describe, expect, it} from 'vitest'

import {
  advanceMemoryMemo,
  createMemoryMemo,
  getDueMemoryReminder,
  getNextRecallAt,
  MEMORY_REINFORCEMENT_INTERVALS,
} from '../schedule'

const NOW = new Date('2026-09-04T03:00:00.000Z')

describe('createMemoryMemo', () => {
  it('should schedule exact and random reminders independently', () => {
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
      nextRecallAt: '2026-09-04T04:05:00.000Z',
      recallMode: 'random',
      reinforcementIndex: 0,
      reminderHistory: [],
      text: '여권 갱신하기',
      version: 1,
    })
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
  it('should consume an exact reminder and a recall due at the same time with one delivery', () => {
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
      nextRecallAt: '2026-09-04T11:10:00.000Z',
      reinforcementIndex: 1,
      reminderHistory: ['2026-09-04T03:10:00.000Z'],
    })
  })
})
