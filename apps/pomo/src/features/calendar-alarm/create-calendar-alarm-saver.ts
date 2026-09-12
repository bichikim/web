import {createMemoryMemo, editMemoryMemo} from '../memory-assist/schedule'
import {isMemoryMemoOwnedDialogue} from '../memory-assist/dialogue-id'
import type {MemoryMemo} from '../memory-assist/schema'

export interface CalendarAlarmSaveOptions {
  readonly memoId: string
  readonly text: string
  readonly alarmAt: Date
  readonly now: Date
  readonly random: () => number
}

export interface CalendarAlarmSaveDependencies {
  readonly updateMemos: (
    update: (memos: ReadonlyArray<MemoryMemo>) => ReadonlyArray<MemoryMemo>,
  ) => Promise<ReadonlyArray<MemoryMemo>>
  readonly cleanup: (memoId: string) => Promise<void>
  readonly reportError: (error: unknown) => void
}

/** Persists an alarm and retirement intent; cleanup failures remain retryable. */
export const createCalendarAlarmSaver =
  (dependencies: CalendarAlarmSaveDependencies) =>
  async (options: CalendarAlarmSaveOptions): Promise<void> => {
    await dependencies.updateMemos((currentMemos) => {
      const existingMemo = currentMemos.find((memo) => memo.id === options.memoId)
      if (existingMemo?.deletionPending === true) {
        throw new Error('Calendar alarm cleanup must finish before rearming.')
      }

      const alarm: MemoryMemo =
        existingMemo === undefined
          ? createMemoryMemo({
              exactReminderAt: options.alarmAt.toISOString(),
              id: options.memoId,
              now: options.now,
              random: options.random,
              recallMode: 'none',
              text: options.text,
            })
          : editMemoryMemo({
              exactReminderAt: options.alarmAt.toISOString(),
              memo: existingMemo,
              now: options.now,
              random: options.random,
              recallMode: 'none',
              text: options.text,
            })
      if (
        existingMemo?.dialogueId !== null &&
        existingMemo?.dialogueId !== undefined &&
        alarm.dialogueId !== existingMemo.dialogueId &&
        isMemoryMemoOwnedDialogue(existingMemo.dialogueId, existingMemo.id)
      ) {
        return [
          {
            ...alarm,
            retiredDialogueIds: [
              ...new Set([...(existingMemo.retiredDialogueIds ?? []), existingMemo.dialogueId]),
            ],
          },
          ...currentMemos.filter((memo) => memo.id !== options.memoId),
        ]
      }
      return [alarm, ...currentMemos.filter((memo) => memo.id !== options.memoId)]
    })
    await dependencies.cleanup(options.memoId).catch(dependencies.reportError)
  }
