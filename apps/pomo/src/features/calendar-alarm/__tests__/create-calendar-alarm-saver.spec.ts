import {expect, it, vi} from 'vitest'
import {
  type CalendarAlarmSaveOptions,
  createCalendarAlarmSaver,
} from '../create-calendar-alarm-saver'
import {createMemoryMemo} from '../../memory-assist/schedule'
import type {MemoryMemo} from '../../memory-assist/schema'

const options: CalendarAlarmSaveOptions = {
  alarmAt: new Date('2026-09-15T09:00:00Z'),
  memoId: 'calendar-alarm:event',
  now: new Date('2026-09-12T09:00:00Z'),
  random: () => 0,
  text: 'Changed alarm',
}
const memo = {
  ...createMemoryMemo({
    exactReminderAt: options.alarmAt.toISOString(),
    id: options.memoId,
    now: options.now,
    random: options.random,
    recallMode: 'none',
    text: 'Old alarm',
  }),
  dialogueId: 'memory-memo-calendar-alarm:event',
}

it('should retain the current memo when persistence fails without starting cleanup', async () => {
  const cleanup = vi.fn()
  const save = createCalendarAlarmSaver({
    cleanup,
    deleteMemo: vi.fn(),
    reportError: vi.fn(),
    updateMemos: async (update) => {
      update([memo])
      throw new Error('write failed')
    },
  })
  await expect(save(options)).rejects.toThrow('write failed')
  expect(cleanup).not.toHaveBeenCalled()
  expect(memo.dialogueId).toBe('memory-memo-calendar-alarm:event')
})

it('should rearm a consumed calendar alarm when saving the same schedule', async () => {
  let stored: ReadonlyArray<MemoryMemo> = [
    {
      ...memo,
      nextExactReminderAt: null,
      reminderEvents: [
        {
          deliveredAt: options.alarmAt.toISOString(),
          kind: 'exact',
          scheduledAt: options.alarmAt.toISOString(),
        },
      ],
      reminderHistory: [options.alarmAt.toISOString()],
    },
  ]
  const save = createCalendarAlarmSaver({
    cleanup: vi.fn().mockResolvedValue(undefined),
    deleteMemo: vi.fn(),
    reportError: vi.fn(),
    updateMemos: async (update) => {
      stored = update(stored)
      return stored
    },
  })

  await save(options)

  expect(stored[0]).toMatchObject({
    exactReminderAt: options.alarmAt.toISOString(),
    nextExactReminderAt: options.alarmAt.toISOString(),
    reminderHistory: [options.alarmAt.toISOString()],
  })
})

it('should persist retirement before cleanup and report cleanup failure without rejecting the save', async () => {
  let stored: ReadonlyArray<MemoryMemo> = [memo]
  let snapshot: ReadonlyArray<MemoryMemo> = []
  const error = new Error('cleanup failed')
  const reportError = vi.fn()
  const save = createCalendarAlarmSaver({
    cleanup: async () => {
      snapshot = stored
      throw error
    },
    deleteMemo: vi.fn(),
    reportError,
    updateMemos: async (update) => {
      stored = update(stored)
      return stored
    },
  })
  await expect(save(options)).resolves.toBeUndefined()
  expect(snapshot[0]).toMatchObject({
    dialogueId: null,
    retiredDialogueIds: [memo.dialogueId],
    text: options.text,
  })
  expect(reportError).toHaveBeenCalledExactlyOnceWith(error)
})

it.each([memo.dialogueId, 'external-dialogue'])(
  'should preserve unchanged dialogue and retire only owned resources (%s)',
  async (dialogueId) => {
    let stored: ReadonlyArray<MemoryMemo> = [{...memo, dialogueId}]
    const cleanup = vi.fn().mockResolvedValue(undefined)
    const save = createCalendarAlarmSaver({
      cleanup,
      deleteMemo: vi.fn(),
      reportError: vi.fn(),
      updateMemos: async (update) => {
        stored = update(stored)
        return stored
      },
    })
    await save({...options, text: memo.text})
    expect(stored[0]?.dialogueId).toBe(dialogueId)
    expect(stored[0]?.retiredDialogueIds).toBeUndefined()
    await save(options)
    expect(stored[0]?.retiredDialogueIds).toEqual(
      dialogueId === memo.dialogueId ? [dialogueId] : undefined,
    )
  },
)

it('should reject rearming a memo awaiting deletion', async () => {
  const cleanup = vi.fn()
  const save = createCalendarAlarmSaver({
    cleanup,
    deleteMemo: vi.fn(),
    reportError: vi.fn(),
    updateMemos: async (update) => update([{...memo, deletionPending: true}]),
  })
  await expect(save(options)).rejects.toThrow('cleanup must finish')
  expect(cleanup).not.toHaveBeenCalled()
})

it('should retire and delete the legacy alarm when saving a scoped alarm', async () => {
  const legacyMemoId = 'calendar-alarm:connection:legacy-event'
  const legacyMemo = createMemoryMemo({
    exactReminderAt: options.alarmAt.toISOString(),
    id: legacyMemoId,
    now: options.now,
    random: options.random,
    recallMode: 'none',
    text: 'Legacy alarm',
  })
  let stored: ReadonlyArray<MemoryMemo> = [legacyMemo]
  const snapshots: ReadonlyArray<MemoryMemo>[] = []
  const deleteMemo = vi.fn(async (memoId: string) => {
    stored = stored.filter((memo) => memo.id !== memoId)
  })
  const save = createCalendarAlarmSaver({
    cleanup: vi.fn().mockResolvedValue(undefined),
    deleteMemo,
    reportError: vi.fn(),
    updateMemos: async (update) => {
      stored = update(stored)
      snapshots.push(stored)
      return stored
    },
  })

  await save({...options, legacyMemoId})

  expect(snapshots[0]).toEqual([
    expect.objectContaining({id: options.memoId}),
    expect.objectContaining({deletionPending: true, id: legacyMemoId}),
  ])
  expect(deleteMemo).toHaveBeenCalledExactlyOnceWith(legacyMemoId)
  expect(stored).toEqual([expect.objectContaining({id: options.memoId})])
})

it('should keep the legacy alarm inactive when its cleanup cannot start', async () => {
  const legacyMemoId = 'calendar-alarm:connection:legacy-event'
  const legacyMemo = createMemoryMemo({
    exactReminderAt: options.alarmAt.toISOString(),
    id: legacyMemoId,
    now: options.now,
    random: options.random,
    recallMode: 'none',
    text: 'Legacy alarm',
  })
  let stored: ReadonlyArray<MemoryMemo> = [legacyMemo]
  const error = new Error('legacy cleanup persistence failed')
  const reportError = vi.fn()
  const save = createCalendarAlarmSaver({
    cleanup: vi.fn().mockResolvedValue(undefined),
    deleteMemo: vi.fn().mockRejectedValue(error),
    reportError,
    updateMemos: async (update) => {
      stored = update(stored)
      return stored
    },
  })

  await expect(save({...options, legacyMemoId})).resolves.toBeUndefined()

  expect(stored).toEqual([
    expect.objectContaining({id: options.memoId}),
    expect.objectContaining({deletionPending: true, id: legacyMemoId}),
  ])
  expect(reportError).toHaveBeenCalledExactlyOnceWith(error)
})

it.each([memo.text, options.text])(
  'should preserve snapshot order and references when saving text %s',
  async (text) => {
    const legacyMemoId = 'calendar-alarm:legacy'
    const unrelated = Object.freeze({...memo, id: 'unrelated'})
    const retiredDialogueIds = Object.freeze([
      'previous-dialogue',
      memo.dialogueId,
      memo.dialogueId,
    ])
    const currentMemo = Object.freeze({...memo, retiredDialogueIds})
    const legacyMemo = Object.freeze({...memo, deletionPending: true, id: legacyMemoId})
    const current = Object.freeze([
      unrelated,
      currentMemo,
      legacyMemo,
      {...memo, id: options.memoId, text: 'Duplicate alarm'},
      {...memo, id: legacyMemoId, text: 'Duplicate legacy alarm'},
      unrelated,
    ])
    let stored: ReadonlyArray<MemoryMemo> = current
    const cleanup = vi.fn().mockResolvedValue(undefined)
    const deleteMemo = vi.fn().mockResolvedValue(undefined)
    const save = createCalendarAlarmSaver({
      cleanup,
      deleteMemo,
      reportError: vi.fn(),
      updateMemos: async (update) => {
        stored = update(current)
        return stored
      },
    })

    await save({...options, legacyMemoId, text})

    expect(stored.map((entry) => entry.id)).toEqual([
      options.memoId,
      legacyMemoId,
      unrelated.id,
      unrelated.id,
    ])
    const [savedAlarm, savedLegacy, firstUnrelated, secondUnrelated] = stored
    expect(savedAlarm).toMatchObject({
      dialogueId: text === memo.text ? memo.dialogueId : null,
      retiredDialogueIds:
        text === memo.text ? retiredDialogueIds : ['previous-dialogue', memo.dialogueId],
      text,
    })
    expect(savedLegacy).toBe(legacyMemo)
    expect(firstUnrelated).toBe(unrelated)
    expect(secondUnrelated).toBe(unrelated)
    expect(currentMemo.retiredDialogueIds).toBe(retiredDialogueIds)
    expect(cleanup).toHaveBeenCalledExactlyOnceWith(options.memoId)
    expect(deleteMemo).toHaveBeenCalledExactlyOnceWith(legacyMemoId)
  },
)

it('should base legacy cleanup on the committed snapshot after current cleanup settles', async () => {
  const legacyMemoId = 'calendar-alarm:legacy'
  const committed = Promise.withResolvers<ReadonlyArray<MemoryMemo>>()
  const cleanupFinished = Promise.withResolvers<void>()
  const cleanupStarted = Promise.withResolvers<void>()
  const cleanup = vi.fn(() => {
    cleanupStarted.resolve()
    return cleanupFinished.promise
  })
  const deleteMemo = vi.fn().mockResolvedValue(undefined)
  const save = createCalendarAlarmSaver({
    cleanup,
    deleteMemo,
    reportError: vi.fn(),
    updateMemos: async (update) => {
      update([memo, {...memo, id: legacyMemoId}])
      return committed.promise
    },
  })

  const saving = save({...options, legacyMemoId})
  expect(cleanup).not.toHaveBeenCalled()
  committed.resolve([{...memo, id: legacyMemoId}])
  await cleanupStarted.promise
  expect(deleteMemo).not.toHaveBeenCalled()
  cleanupFinished.resolve()
  await saving
  expect(deleteMemo).toHaveBeenCalledExactlyOnceWith(legacyMemoId)
})

it('should skip legacy cleanup when persistence returns a snapshot without it', async () => {
  const legacyMemoId = 'calendar-alarm:legacy'
  const deleteMemo = vi.fn()
  const save = createCalendarAlarmSaver({
    cleanup: vi.fn().mockResolvedValue(undefined),
    deleteMemo,
    reportError: vi.fn(),
    updateMemos: async (update) => {
      update([memo, {...memo, id: legacyMemoId}])
      return [memo]
    },
  })

  await save({...options, legacyMemoId})

  expect(deleteMemo).not.toHaveBeenCalled()
})
