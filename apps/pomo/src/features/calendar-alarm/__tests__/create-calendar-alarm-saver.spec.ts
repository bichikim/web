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
    reportError: vi.fn(),
    updateMemos: async (update) => update([{...memo, deletionPending: true}]),
  })
  await expect(save(options)).rejects.toThrow('cleanup must finish')
  expect(cleanup).not.toHaveBeenCalled()
})
